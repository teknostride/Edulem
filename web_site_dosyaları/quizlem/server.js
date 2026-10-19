const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'quizlem_super_secret_key_2026';

// ----------------------------------------------------
// 1. VERİTABANI KURULUMU VE MİGRASYON
// ----------------------------------------------------
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'quizlem.db'));
db.pragma('journal_mode = WAL');

// Tabloları Oluştur
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'teacher',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Genel',
    cover_color TEXT DEFAULT 'indigo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple', -- 'multiple', 'boolean', 'fill_blank', 'order', 'multiselect', 'image_choice'
    options TEXT NOT NULL,                -- JSON Array
    correct_option TEXT NOT NULL,         -- İndeks, JSON array, veya kabul edilen metin
    image_url TEXT,                       -- Soru için isteğe bağlı görsel URL'si
    time_limit INTEGER DEFAULT 20,
    points_multiplier INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );

  -- Raporlama ve Oturum Geçmişi Tabloları
  CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin TEXT NOT NULL,
    quiz_id INTEGER,
    user_id INTEGER NOT NULL,
    quiz_title TEXT NOT NULL,
    total_questions INTEGER DEFAULT 0,
    player_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS game_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_session_id INTEGER NOT NULL,
    nickname TEXT NOT NULL,
    avatar TEXT DEFAULT '🐱',
    total_score INTEGER DEFAULT 0,
    final_rank INTEGER DEFAULT 1,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    accuracy_pct REAL DEFAULT 0,
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS game_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_session_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    question_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    submitted_answer TEXT,
    is_correct INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES game_players(id) ON DELETE CASCADE
  );
`);

// Migration Kontrolü: image_url kolonu var mı?
const cols = db.prepare(`PRAGMA table_info(questions)`).all();
if (!cols.some(c => c.name === 'image_url')) {
  try {
    db.exec(`ALTER TABLE questions ADD COLUMN image_url TEXT;`);
  } catch (e) {}
}

// Türkçe karakterleri ve noktalama işaretlerini normalize eden yardımcı fonksiyon
function normalizeTurkish(str) {
  if (!str) return '';
  return str.toString()
    .trim()
    .toLowerCase()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

// Demo Verilerini Tohumlama
function seedDemoData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  console.log('🌱 Veritabanı tohumlanıyor (Yeni soru tipleriyle birlikte)...');

  const passwordHash = bcrypt.hashSync('123456', 10);
  const teacherResult = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role)
    VALUES ('ogretmen', ?, 'Ahmet Öğretmen', 'teacher')
  `).run(passwordHash);

  const teacherId = teacherResult.lastInsertRowid;

  const insertQuiz = db.prepare(`
    INSERT INTO quizzes (user_id, title, description, category, cover_color)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertQ = db.prepare(`
    INSERT INTO questions (quiz_id, question_text, question_type, options, correct_option, image_url, time_limit, points_multiplier, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Zengin Vitrin Testi: Tüm Soru Tiplerini İçeren Mega Yarışma
  const quiz1 = insertQuiz.run(
    teacherId,
    'Süper Bilgi Şöleni 🚀 (Tüm Soru Tipleri)',
    'Çoktan seçmeli, boşluk doldurma, kronolojik sıralama, çoklu seçim ve görsel soruları içerir.',
    'Genel',
    'indigo'
  );
  const q1Id = quiz1.lastInsertRowid;

  const showcaseQuestions = [
    // 1. Standart Çoktan Seçmeli
    {
      text: 'Güneş Sistemi\'ndeki en büyük gezegen hangisidir?',
      type: 'multiple',
      options: JSON.stringify(['Mars', 'Jüpiter', 'Satürn', 'Neptün']),
      correct: '1',
      imageUrl: '',
      time: 20,
      multiplier: 1
    },
    // 2. Boşluk Doldurma (Metin Yazma)
    {
      text: 'Türkiye Cumhuriyeti\'nin başkenti hangi ilimizdir?',
      type: 'fill_blank',
      options: JSON.stringify([]),
      correct: JSON.stringify(['Ankara', 'ankara']),
      imageUrl: '',
      time: 25,
      multiplier: 1
    },
    // 3. Sıralama (Kronolojik / Adım Adım)
    {
      text: 'Tarihsel olayları eskiden yeniye doğru kronolojik olarak sıralayın:',
      type: 'order',
      options: JSON.stringify([
        'İstanbul\'un Fethi (1453)',
        'Cumhuriyet\'in İlanı (1923)',
        'Ay\'a İlk İnsan Ayak Basması (1969)',
        'İlk Akıllı Telefonun Çıkışı (2007)'
      ]),
      correct: JSON.stringify([0, 1, 2, 3]),
      imageUrl: '',
      time: 30,
      multiplier: 2 // Çift puan
    },
    // 4. Çok Cevaplı (Birden fazla doğru şık)
    {
      text: 'Aşağıdakilerden hangileri birer İnternet Tarayıcısıdır (Browser)? (Tüm doğruları seçin)',
      type: 'multiselect',
      options: JSON.stringify([
        'Google Chrome',
        'Mozilla Firefox',
        'Adobe Photoshop',
        'Microsoft Excel'
      ]),
      correct: JSON.stringify([0, 1]), // Chrome ve Firefox
      imageUrl: '',
      time: 25,
      multiplier: 1
    },
    // 5. Görsel Seçmeli Soru
    {
      text: 'Aşağıdaki hayvanlardan hangisi memelidir (doğurarak ürer)?',
      type: 'image_choice',
      options: JSON.stringify([
        { text: 'Kedi', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80' },
        { text: 'Alabalık', image: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400&auto=format&fit=crop&q=80' },
        { text: 'Kartal', image: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=400&auto=format&fit=crop&q=80' },
        { text: 'Bukalemun', image: 'https://images.unsplash.com/photo-1563281577-a7be47e20db9?w=400&auto=format&fit=crop&q=80' }
      ]),
      correct: '0', // Kedi
      imageUrl: '',
      time: 20,
      multiplier: 1
    },
    // 6. Doğru / Yanlış
    {
      text: 'HTML bir programlama dili değildir, bir işaretleme (markup) dilidir.',
      type: 'boolean',
      options: JSON.stringify(['Doğru', 'Yanlış']),
      correct: '0',
      imageUrl: '',
      time: 15,
      multiplier: 1
    }
  ];

  showcaseQuestions.forEach((q, idx) => {
    insertQ.run(q1Id, q.text, q.type, q.options, q.correct, q.imageUrl || '', q.time, q.multiplier, idx);
  });

  // 2. Demo Quiz: Web & Teknoloji Dünyası
  const quiz2 = insertQuiz.run(
    teacherId,
    'Web & Yazılım Dünyası 💻',
    'Yazılım prensipleri, frontend teknolojileri ve mantık soruları.',
    'Teknoloji',
    'purple'
  );
  const q2Id = quiz2.lastInsertRowid;

  const webQuestions = [
    {
      text: 'Web sayfalarına stil kazandırmak için hangi teknoloji kullanılır?',
      type: 'multiple',
      options: JSON.stringify(['CSS', 'SQL', 'PHP', 'Python']),
      correct: '0',
      imageUrl: '',
      time: 20,
      multiplier: 1
    },
    {
      text: 'JavaScript dilinde değişken tanımlama anahtar kelimesi (keyword) yazın:',
      type: 'fill_blank',
      options: JSON.stringify([]),
      correct: JSON.stringify(['let', 'const', 'var']),
      imageUrl: '',
      time: 20,
      multiplier: 1
    }
  ];

  webQuestions.forEach((q, idx) => {
    insertQ.run(q2Id, q.text, q.type, q.options, q.correct, q.imageUrl || '', q.time, q.multiplier, idx);
  });

  console.log('✅ Zengin soru tipleriyle demo veriler başarıyla oluşturuldu!');
}

seedDemoData();

// ----------------------------------------------------
// 2. EXPRESS VE MIDDLEWARE YAPISI
// ----------------------------------------------------
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş oturum.' });
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// 3. REST API UÇ NOKTALARI
// ----------------------------------------------------

// Görsel Yükleme (Base64 PNG/JPG/WEBP)
app.post('/api/upload', authenticateToken, (req, res) => {
  try {
    const { image, name } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Görsel verisi bulunamadı.' });
    }

    // data:image/png;base64,.... formatını çöz
    const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    let ext = 'png';
    let buffer;

    if (matches && matches.length === 3) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }

    const uniqueName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      url: `/uploads/${uniqueName}`
    });
  } catch (error) {
    console.error('Upload hatası:', error);
    res.status(500).json({ error: 'Görsel yüklenemedi.' });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, full_name } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Tüm alanları doldurunuz.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, 'teacher')
    `).run(username, passwordHash, full_name);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, full_name, role: 'teacher' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Kayıt başarılı.',
      token,
      user: { id: result.lastInsertRowid, username, full_name, role: 'teacher' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Kayıt sırasında sunucu hatası.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Giriş başarılı.',
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Giriş hatası.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  res.json({ user });
});

app.get('/api/quizzes', authenticateToken, (req, res) => {
  try {
    const quizzes = db.prepare(`
      SELECT q.*, 
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
      FROM quizzes q
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC
    `).all(req.user.id);

    res.json({ quizzes });
  } catch (error) {
    res.status(500).json({ error: 'Testler getirilemedi.' });
  }
});

app.get('/api/quizzes/:id', authenticateToken, (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!quiz) return res.status(404).json({ error: 'Test bulunamadı.' });

    const questions = db.prepare(`
      SELECT * FROM questions 
      WHERE quiz_id = ? 
      ORDER BY order_index ASC
    `).all(quiz.id);

    const formattedQuestions = questions.map(q => {
      let parsedOptions = [];
      let parsedCorrect = q.correct_option;
      try { parsedOptions = JSON.parse(q.options); } catch (e) { parsedOptions = []; }
      try { parsedCorrect = JSON.parse(q.correct_option); } catch (e) {}

      return {
        ...q,
        options: parsedOptions,
        correct_option: parsedCorrect
      };
    });

    res.json({ quiz, questions: formattedQuestions });
  } catch (error) {
    res.status(500).json({ error: 'Test detayları getirilemedi.' });
  }
});

app.post('/api/quizzes', authenticateToken, (req, res) => {
  try {
    const { title, description, category, cover_color, questions } = req.body;
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Test başlığı ve en az bir soru zorunludur.' });
    }

    const insertQuizTx = db.transaction(() => {
      const quizResult = db.prepare(`
        INSERT INTO quizzes (user_id, title, description, category, cover_color)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.user.id, title, description || '', category || 'Genel', cover_color || 'indigo');
      const quizId = quizResult.lastInsertRowid;

      const qStmt = db.prepare(`
        INSERT INTO questions (quiz_id, question_text, question_type, options, correct_option, image_url, time_limit, points_multiplier, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q, idx) => {
        let correctVal = q.correct_option;
        if (typeof correctVal === 'object') {
          correctVal = JSON.stringify(correctVal);
        } else {
          correctVal = String(correctVal);
        }

        qStmt.run(
          quizId,
          q.question_text,
          q.question_type || 'multiple',
          JSON.stringify(q.options || []),
          correctVal,
          q.image_url || '',
          parseInt(q.time_limit) || 20,
          parseInt(q.points_multiplier) || 1,
          idx
        );
      });

      return quizId;
    });

    const newQuizId = insertQuizTx();
    res.status(201).json({ message: 'Test başarıyla oluşturuldu.', quizId: newQuizId });
  } catch (error) {
    console.error('Quiz oluşturma hatası:', error);
    res.status(500).json({ error: 'Test kaydedilemedi.' });
  }
});

app.put('/api/quizzes/:id', authenticateToken, (req, res) => {
  try {
    const quizId = req.params.id;
    const { title, description, category, cover_color, questions } = req.body;

    const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ? AND user_id = ?').get(quizId, req.user.id);
    if (!quiz) return res.status(404).json({ error: 'Test bulunamadı.' });

    const updateQuizTx = db.transaction(() => {
      db.prepare(`
        UPDATE quizzes 
        SET title = ?, description = ?, category = ?, cover_color = ?
        WHERE id = ?
      `).run(title, description || '', category || 'Genel', cover_color || 'indigo', quizId);

      db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(quizId);

      const qStmt = db.prepare(`
        INSERT INTO questions (quiz_id, question_text, question_type, options, correct_option, image_url, time_limit, points_multiplier, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q, idx) => {
        let correctVal = q.correct_option;
        if (typeof correctVal === 'object') {
          correctVal = JSON.stringify(correctVal);
        } else {
          correctVal = String(correctVal);
        }

        qStmt.run(
          quizId,
          q.question_text,
          q.question_type || 'multiple',
          JSON.stringify(q.options || []),
          correctVal,
          q.image_url || '',
          parseInt(q.time_limit) || 20,
          parseInt(q.points_multiplier) || 1,
          idx
        );
      });
    });

    updateQuizTx();
    res.json({ message: 'Test başarıyla güncellendi.' });
  } catch (error) {
    console.error('Quiz güncelleme hatası:', error);
    res.status(500).json({ error: 'Test güncellenemedi.' });
  }
});

app.delete('/api/quizzes/:id', authenticateToken, (req, res) => {
  try {
    const quizId = req.params.id;
    const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ? AND user_id = ?').get(quizId, req.user.id);
    if (!quiz) return res.status(404).json({ error: 'Test bulunamadı.' });

    db.prepare('DELETE FROM questions WHERE quiz_id = ?').run(quizId);
    db.prepare('DELETE FROM quizzes WHERE id = ?').run(quizId);

    res.json({ message: 'Test başarıyla silindi.' });
  } catch (error) {
    res.status(500).json({ error: 'Test silinemedi.' });
  }
});

// ----------------------------------------------------
// 3.1 RAPORLAMA REST API UÇ NOKTALARI
// ----------------------------------------------------

// Öğretmenin Geçmiş Yarışma Raporlarını Listele
app.get('/api/reports', authenticateToken, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT 
        s.*,
        (SELECT nickname FROM game_players WHERE game_session_id = s.id AND final_rank = 1) AS winner_name,
        (SELECT avatar FROM game_players WHERE game_session_id = s.id AND final_rank = 1) AS winner_avatar,
        (SELECT total_score FROM game_players WHERE game_session_id = s.id AND final_rank = 1) AS winner_score,
        (SELECT ROUND(AVG(accuracy_pct), 1) FROM game_players WHERE game_session_id = s.id) AS avg_accuracy
      FROM game_sessions s
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(req.user.id);

    res.json({ reports });
  } catch (error) {
    console.error('Rapor listesi hatası:', error);
    res.status(500).json({ error: 'Raporlar alınamadı.' });
  }
});

// Belirli Bir Yarışmanın Detaylı Rapor Verilerini Al
app.get('/api/reports/:id', authenticateToken, (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM game_sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Rapor bulunamadı.' });

    const players = db.prepare('SELECT * FROM game_players WHERE game_session_id = ? ORDER BY final_rank ASC').all(session.id);
    const answers = db.prepare(`
      SELECT a.*, p.nickname, p.avatar, p.final_rank
      FROM game_answers a
      JOIN game_players p ON a.player_id = p.id
      WHERE a.game_session_id = ?
      ORDER BY a.question_index ASC, p.final_rank ASC
    `).all(session.id);

    // Sorular ve İstatistikleri
    const rawQuestions = db.prepare(`
      SELECT DISTINCT question_index, question_text, question_type
      FROM game_answers
      WHERE game_session_id = ?
      ORDER BY question_index ASC
    `).all(session.id);

    const questions = rawQuestions.map(q => {
      const qAns = answers.filter(a => a.question_index === q.question_index);
      const total = qAns.length;
      const correct = qAns.filter(a => a.is_correct === 1).length;
      const wrong = total - correct;
      const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
      const totalTime = qAns.reduce((s, a) => s + (a.response_time_ms || 0), 0);
      const avgTime = total > 0 ? (totalTime / total / 1000).toFixed(1) : '0.0';

      return {
        question_index: q.question_index,
        question_text: q.question_text,
        question_type: q.question_type,
        totalAnswered: total,
        correctCount: correct,
        wrongCount: wrong,
        accuracyPct: acc,
        avgTimeSec: avgTime
      };
    });

    res.json({
      session,
      players,
      questions,
      answers
    });
  } catch (error) {
    console.error('Rapor detay hatası:', error);
    res.status(500).json({ error: 'Rapor detayları yüklenemedi.' });
  }
});

// Excel (.xlsx) Formatında Çok Sekmeli Rapor İndir
app.get('/api/reports/:id/excel', authenticateToken, (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM game_sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Rapor bulunamadı.' });

    const players = db.prepare('SELECT * FROM game_players WHERE game_session_id = ? ORDER BY final_rank ASC').all(session.id);
    const answers = db.prepare(`
      SELECT a.*, p.nickname, p.avatar, p.final_rank
      FROM game_answers a
      JOIN game_players p ON a.player_id = p.id
      WHERE a.game_session_id = ?
      ORDER BY a.question_index ASC, p.final_rank ASC
    `).all(session.id);

    const rawQuestions = db.prepare(`
      SELECT DISTINCT question_index, question_text, question_type
      FROM game_answers
      WHERE game_session_id = ?
      ORDER BY question_index ASC
    `).all(session.id);

    const totalPlayers = players.length;
    const avgAccuracy = totalPlayers > 0 ? Math.round(players.reduce((sum, p) => sum + (p.accuracy_pct || 0), 0) / totalPlayers) : 0;

    const wb = XLSX.utils.book_new();

    // ----------------------------------------------------
    // SAYFA 1: GENEL SIRALAMA VE ÖZET
    // ----------------------------------------------------
    const summaryAoa = [
      ['QUIZLEM - YARIŞMA RAPORU VE GENEL SIRALAMA'],
      ['Oluşturulma Tarihi:', new Date().toLocaleString('tr-TR')],
      [''],
      ['Yarışma Başlığı:', session.quiz_title],
      ['Oturum PIN Kodu:', session.pin],
      ['Oynanma Tarihi:', new Date(session.created_at).toLocaleString('tr-TR')],
      ['Toplam Soru Sayısı:', session.total_questions],
      ['Toplam Katılımcı:', totalPlayers],
      ['Sınıf Başarı Ortalaması:', `%${avgAccuracy}`],
      [''],
      ['GENEL SIRALAMA TABLOSU'],
      ['Sıra', 'Avatar', 'Öğrenci Rumuzu', 'Toplam Puan', 'Doğru Sayısı', 'Yanlış Sayısı', 'Başarı Oranı (%)']
    ];

    players.forEach(p => {
      summaryAoa.push([
        p.final_rank,
        p.avatar,
        p.nickname,
        p.total_score,
        p.correct_count,
        p.wrong_count,
        `%${p.accuracy_pct}`
      ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
    wsSummary['!cols'] = [
      { wch: 10 },
      { wch: 8 },
      { wch: 25 },
      { wch: 15 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Genel Sıralama');

    // ----------------------------------------------------
    // SAYFA 2: ÖĞRENCİ - SORU DETAYLI CEVAP MATRİSİ
    // ----------------------------------------------------
    const matrixHeader = ['Sıra', 'Rumuz', 'Toplam Puan'];
    rawQuestions.forEach((q, idx) => {
      const preview = q.question_text.length > 25 ? q.question_text.substring(0, 25) + '...' : q.question_text;
      matrixHeader.push(`S${idx + 1}: ${preview}`);
    });

    const matrixAoa = [
      ['ÖĞRENCİ - SORU DETAYLI CEVAP MATRİSİ'],
      ['Açıklama: Hücrelerde Doğruluk Durumu (✓ DOĞRU / ✗ YANLIŞ), Verilen Cevap, Puan ve Yanıt Süresi yer alır.'],
      [''],
      matrixHeader
    ];

    players.forEach(p => {
      const row = [p.final_rank, p.nickname, p.total_score];
      rawQuestions.forEach(q => {
        const ans = answers.find(a => a.player_id === p.id && a.question_index === q.question_index);
        if (ans) {
          const status = ans.is_correct ? '✓ DOĞRU' : '✗ YANLIŞ';
          const sec = (ans.response_time_ms / 1000).toFixed(1);
          row.push(`${status} | Yanıt: "${ans.submitted_answer}" (+${ans.earned_points}P, ${sec}sn)`);
        } else {
          row.push('- Cevap Yok -');
        }
      });
      matrixAoa.push(row);
    });

    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixAoa);
    wsMatrix['!cols'] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 14 },
      ...rawQuestions.map(() => ({ wch: 38 }))
    ];
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Cevap Matrisi');

    // ----------------------------------------------------
    // SAYFA 3: SORU BAZLI ANALİZ VE ZORLUK İSTATİSTİKLERİ
    // ----------------------------------------------------
    const questionAoa = [
      ['SORU BAZLI SINIF BAŞARI VE ZORLUK ANALİZİ'],
      [''],
      ['Soru No', 'Soru Tipi', 'Soru Metni', 'Katılımcı', 'Doğru Sayısı', 'Yanlış Sayısı', 'Başarı Oranı (%)', 'Ort. Yanıt Süresi (sn)']
    ];

    rawQuestions.forEach(q => {
      const qAns = answers.filter(a => a.question_index === q.question_index);
      const count = qAns.length;
      const correct = qAns.filter(a => a.is_correct === 1).length;
      const wrong = count - correct;
      const acc = count > 0 ? Math.round((correct / count) * 100) : 0;
      const totalTime = qAns.reduce((s, a) => s + (a.response_time_ms || 0), 0);
      const avgTime = count > 0 ? (totalTime / count / 1000).toFixed(1) : '0.0';

      questionAoa.push([
        `Soru ${q.question_index + 1}`,
        q.question_type,
        q.question_text,
        count,
        correct,
        wrong,
        `%${acc}`,
        `${avgTime} sn`
      ]);
    });

    const wsQuestions = XLSX.utils.aoa_to_sheet(questionAoa);
    wsQuestions['!cols'] = [
      { wch: 10 },
      { wch: 16 },
      { wch: 45 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsQuestions, 'Soru Analizi');

    // Dosyayı oluştur ve gönder
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeTitle = (session.quiz_title || 'Yarisma').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `QuizLem_Rapor_${safeTitle}_${session.pin}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Excel export hatası:', error);
    res.status(500).json({ error: 'Excel raporu oluşturulamadı.' });
  }
});

// Rapor Oturumunu Sil
app.delete('/api/reports/:id', authenticateToken, (req, res) => {
  try {
    const session = db.prepare('SELECT id FROM game_sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Rapor bulunamadı.' });

    db.prepare('DELETE FROM game_answers WHERE game_session_id = ?').run(session.id);
    db.prepare('DELETE FROM game_players WHERE game_session_id = ?').run(session.id);
    db.prepare('DELETE FROM game_sessions WHERE id = ?').run(session.id);

    res.json({ message: 'Rapor başarıyla silindi.' });
  } catch (error) {
    console.error('Rapor silme hatası:', error);
    res.status(500).json({ error: 'Rapor silinemedi.' });
  }
});

// ----------------------------------------------------
// 4. SOCKET.IO GERÇEK ZAMANLI OYUN MOTORU
// ----------------------------------------------------

const activeGames = new Map();

function generateGamePin() {
  let pin;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (activeGames.has(pin));
  return pin;
}

const AVATARS = ['🐱', '🐶', '🦊', '🦁', '🐯', '🐼', '🐨', '🐸', '🐙', '🦄', '🚀', '⚡'];

io.on('connection', (socket) => {
  // Host: Oyun Oluştur
  socket.on('host:create_game', ({ quizId, token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
      if (!quiz) return socket.emit('error_message', { message: 'Test bulunamadı.' });

      const rawQuestions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC').all(quizId);
      if (rawQuestions.length === 0) {
        return socket.emit('error_message', { message: 'Bu teste ait soru bulunmuyor.' });
      }

      const questions = rawQuestions.map(q => {
        let parsedOpts = [];
        let parsedCorrect = q.correct_option;
        try { parsedOpts = JSON.parse(q.options); } catch (e) {}
        try { parsedCorrect = JSON.parse(q.correct_option); } catch (e) {}
        return {
          ...q,
          options: parsedOpts,
          correct_option: parsedCorrect
        };
      });

      const pin = generateGamePin();

      const sessionInsert = db.prepare(`
        INSERT INTO game_sessions (pin, quiz_id, user_id, quiz_title, total_questions)
        VALUES (?, ?, ?, ?, ?)
      `).run(pin, quizId, decoded.id, quiz.title, questions.length);
      const dbSessionId = sessionInsert.lastInsertRowid;

      const gameSession = {
        pin,
        dbSessionId,
        quizId,
        userId: decoded.id,
        quizTitle: quiz.title,
        hostSocketId: socket.id,
        status: 'LOBBY',
        currentQuestionIndex: -1,
        questions,
        players: new Map(),
        timer: null,
        timeLeft: 0,
        totalTime: 0,
        questionStartTime: 0,
        answersReceived: 0,
        submittedAnswersData: [],
        settings: {
          showQuestionsOnStudent: false, // Soruların ve görsellerin öğrenci telefonunda görünmesi
          showOptionsTextOnStudent: false, // Şık metinlerinin öğrenci butonlarında görünmesi
          shuffleQuestions: false, // Soruları karıştır
          shuffleOptions: false // Şıkları karıştır
        },
        voiceStatus: {
          isBroadcasting: false,
          hasMic: false,
          hasPcAudio: false
        }
      };

      activeGames.set(pin, gameSession);
      socket.join(pin);
      socket.gamePin = pin;
      socket.isHost = true;

      console.log(`🎮 Oyun Oluşturuldu: PIN ${pin} ("${quiz.title}", Session #${dbSessionId})`);

      socket.emit('host:game_created', {
        pin,
        sessionId: dbSessionId,
        quizTitle: quiz.title,
        totalQuestions: questions.length,
        settings: gameSession.settings
      });
    } catch (err) {
      socket.emit('error_message', { message: 'Oturum geçersiz veya süresi doldu.' });
    }
  });

  // Host: Yarışma Ayarlarını Güncelle
  socket.on('host:update_settings', ({ pin, settings }) => {
    const game = activeGames.get(pin);
    if (!game || game.hostSocketId !== socket.id) return;
    game.settings = { ...game.settings, ...settings };
    socket.emit('host:settings_updated', { settings: game.settings });
    io.to(pin).emit('game:settings_changed', { settings: game.settings });
  });

  // Host & Canlı Ses Yayını (WebRTC Signaling Relay)
  socket.on('voice:status', ({ pin, isBroadcasting, hasMic, hasPcAudio }) => {
    const game = activeGames.get(pin);
    if (!game || game.hostSocketId !== socket.id) return;
    game.voiceStatus = { isBroadcasting, hasMic, hasPcAudio };
    io.to(pin).emit('voice:status', game.voiceStatus);
  });

  socket.on('voice:join_listen', ({ pin }) => {
    const game = activeGames.get(pin);
    if (!game) return;
    // Host'a yeni dinleyici katıldığını bildir
    io.to(game.hostSocketId).emit('voice:student_joined', { studentSocketId: socket.id });
  });

  socket.on('voice:offer', ({ to, sdp }) => {
    io.to(to).emit('voice:offer', { sdp, from: socket.id });
  });

  socket.on('voice:answer', ({ to, sdp }) => {
    io.to(to).emit('voice:answer', { sdp, from: socket.id });
  });

  socket.on('voice:candidate', ({ to, candidate }) => {
    io.to(to).emit('voice:candidate', { candidate, from: socket.id });
  });

  // Host: Oyunu Başlat
  socket.on('host:start_game', ({ pin }) => {
    const game = activeGames.get(pin);
    if (!game || game.hostSocketId !== socket.id) return;
    if (game.players.size === 0) {
      return socket.emit('error_message', { message: 'En az 1 oyuncu katılmalıdır.' });
    }

    // Soruları karıştırma ayarı aktifse karıştır
    if (game.settings && game.settings.shuffleQuestions) {
      for (let i = game.questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [game.questions[i], game.questions[j]] = [game.questions[j], game.questions[i]];
      }
    }

    game.currentQuestionIndex = 0;
    startQuestion(game);
  });

  // Host: Sonraki Soru
  socket.on('host:next_question', ({ pin }) => {
    const game = activeGames.get(pin);
    if (!game || game.hostSocketId !== socket.id) return;

    if (game.timer) clearInterval(game.timer);

    game.currentQuestionIndex++;
    if (game.currentQuestionIndex < game.questions.length) {
      startQuestion(game);
    } else {
      finishGame(game);
    }
  });

  // Öğrenci: Katıl
  socket.on('player:join', ({ pin, nickname, avatar }) => {
    const cleanPin = (pin || '').trim();
    const cleanNick = (nickname || '').trim();

    if (!cleanPin || !cleanNick) {
      return socket.emit('player:join_error', { message: 'PIN ve Rumuz gereklidir.' });
    }

    const game = activeGames.get(cleanPin);
    if (!game) {
      return socket.emit('player:join_error', { message: 'Geçersiz PIN kodu.' });
    }

    if (game.status !== 'LOBBY') {
      return socket.emit('player:join_error', { message: 'Yarışma zaten başladı.' });
    }

    for (const p of game.players.values()) {
      if (p.nickname.toLowerCase() === cleanNick.toLowerCase()) {
        return socket.emit('player:join_error', { message: 'Bu rumuz zaten kullanılıyor.' });
      }
    }

    const selectedAvatar = avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const playerData = {
      socketId: socket.id,
      nickname: cleanNick,
      avatar: selectedAvatar,
      score: 0,
      streak: 0,
      lastEarned: 0,
      answers: {}
    };

    game.players.set(socket.id, playerData);
    socket.join(cleanPin);
    socket.gamePin = cleanPin;
    socket.isHost = false;

    socket.emit('player:join_success', {
      pin: cleanPin,
      nickname: cleanNick,
      avatar: selectedAvatar,
      quizTitle: game.quizTitle
    });

    if (game.voiceStatus && game.voiceStatus.isBroadcasting) {
      socket.emit('voice:status', game.voiceStatus);
    }

    broadcastPlayerList(game);
  });

  // Öğrenci: Cevap Gönder (Tüm Soru Tipleri Desteklenir)
  socket.on('player:submit_answer', ({ pin, answer, optionIndex }) => {
    const game = activeGames.get(pin);
    if (!game || game.status !== 'QUESTION') return;

    const player = game.players.get(socket.id);
    if (!player) return;

    const qIdx = game.currentQuestionIndex;
    if (player.answers[qIdx] !== undefined) return; // Zaten cevapladı

    const currentQ = game.questions[qIdx];
    const timeSpentMs = Date.now() - game.questionStartTime;
    const submittedVal = (answer !== undefined) ? answer : optionIndex;

    // --- Soru Tipine Göre Doğruluk Değerlendirmesi ---
    let isCorrect = false;

    switch (currentQ.question_type) {
      case 'boolean':
      case 'multiple':
      case 'image_choice': {
        const correctIndex = parseInt(currentQ.correct_option);
        isCorrect = (parseInt(submittedVal) === correctIndex);
        break;
      }

      case 'fill_blank': {
        // Boşluk Doldurma: Kabul edilen kelimeler listesi ile karşılaştırma
        const userWord = normalizeTurkish(submittedVal);
        let accepted = [];
        if (Array.isArray(currentQ.correct_option)) {
          accepted = currentQ.correct_option;
        } else if (typeof currentQ.correct_option === 'string') {
          try {
            const parsed = JSON.parse(currentQ.correct_option);
            accepted = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            accepted = [currentQ.correct_option];
          }
        }
        isCorrect = accepted.some(w => normalizeTurkish(w) === userWord);
        break;
      }

      case 'order': {
        // Sıralama Sorusu: Gönderilen dizi ile hedef dizi eşleşmesi
        let submittedOrder = Array.isArray(submittedVal) ? submittedVal.map(Number) : [];
        let targetOrder = [0, 1, 2, 3];
        if (Array.isArray(currentQ.correct_option)) {
          targetOrder = currentQ.correct_option.map(Number);
        } else {
          try { targetOrder = JSON.parse(currentQ.correct_option).map(Number); } catch (e) {}
        }

        // Tüm adımlar doğru sırada mı?
        const matchCount = submittedOrder.filter((v, i) => v === targetOrder[i]).length;
        isCorrect = (matchCount === targetOrder.length && submittedOrder.length === targetOrder.length);
        break;
      }

      case 'multiselect': {
        // Çoklu Seçim: Gönderilen şıklar hedef şıklarla tam örtüşüyor mu?
        let submittedIndices = Array.isArray(submittedVal) ? submittedVal.map(Number).sort((a,b)=>a-b) : [Number(submittedVal)];
        let targetIndices = [];
        if (Array.isArray(currentQ.correct_option)) {
          targetIndices = currentQ.correct_option.map(Number).sort((a,b)=>a-b);
        } else {
          try { targetIndices = JSON.parse(currentQ.correct_option).map(Number).sort((a,b)=>a-b); } catch (e) {}
        }

        isCorrect = (
          submittedIndices.length === targetIndices.length &&
          submittedIndices.every((val, idx) => val === targetIndices[idx])
        );
        break;
      }

      default:
        isCorrect = (parseInt(submittedVal) === parseInt(currentQ.correct_option));
    }

    // --- Puanlama Algoritması ---
    let earnedPoints = 0;
    if (isCorrect) {
      const totalTimeMs = game.totalTime * 1000;
      const timeFactor = Math.max(0, 1 - (timeSpentMs / totalTimeMs) / 2);
      const basePoints = 1000 * (currentQ.points_multiplier || 1);
      earnedPoints = Math.round(basePoints * timeFactor);

      player.streak++;
      if (player.streak > 1) {
        earnedPoints += (player.streak - 1) * 50;
      }
    } else {
      player.streak = 0;
      earnedPoints = 0;
    }

    player.score += earnedPoints;
    player.lastEarned = earnedPoints;
    player.answers[qIdx] = {
      submittedVal,
      isCorrect,
      earnedPoints,
      timeSpentMs
    };

    game.answersReceived++;
    game.submittedAnswersData.push({
      nickname: player.nickname,
      submittedVal,
      isCorrect
    });

    socket.emit('player:answer_recorded', { answer: submittedVal });

    io.to(game.hostSocketId).emit('host:answer_count_update', {
      answersReceived: game.answersReceived,
      totalPlayers: game.players.size
    });

    if (game.answersReceived >= game.players.size) {
      endQuestion(game);
    }
  });

  // Ayrılma
  socket.on('disconnect', () => {
    const pin = socket.gamePin;
    if (!pin) return;

    const game = activeGames.get(pin);
    if (!game) return;

    if (socket.isHost) {
      if (game.timer) clearInterval(game.timer);
      io.to(pin).emit('game:host_disconnected', {
        message: 'Öğretmen ayrıldığı için yarışma sonlandırıldı.'
      });
      activeGames.delete(pin);
    } else {
      game.players.delete(socket.id);
      if (game.status === 'LOBBY') {
        broadcastPlayerList(game);
      } else if (game.status === 'QUESTION') {
        if (game.answersReceived >= game.players.size && game.players.size > 0) {
          endQuestion(game);
        }
      }
    }
  });
});

function broadcastPlayerList(game) {
  const playerList = Array.from(game.players.values()).map(p => ({
    id: p.socketId,
    socketId: p.socketId,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score
  }));

  io.to(game.pin).emit('room:player_list', {
    count: playerList.length,
    players: playerList
  });
}

function startQuestion(game) {
  if (game.timer) clearInterval(game.timer);

  game.status = 'QUESTION';
  game.answersReceived = 0;
  game.submittedAnswersData = [];
  
  const q = game.questions[game.currentQuestionIndex];
  game.totalTime = q.time_limit || 20;
  game.timeLeft = game.totalTime;
  game.questionStartTime = Date.now();

  // Host Payload
  io.to(game.hostSocketId).emit('host:question_start', {
    questionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
    questionText: q.question_text,
    questionType: q.question_type,
    options: q.options,
    imageUrl: q.image_url,
    timeLimit: game.totalTime,
    pointsMultiplier: q.points_multiplier
  });

  // Öğrenci Payload (Anti-Cheat & Soru Tipi Uyarlaması & Kullanıcı Ayarları)
  const showQText = !!(game.settings && game.settings.showQuestionsOnStudent);
  const showOptText = !!(game.settings && game.settings.showOptionsTextOnStudent);

  for (const [sId, player] of game.players.entries()) {
    let studentPayload = {
      questionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length,
      questionType: q.question_type,
      optionsCount: Array.isArray(q.options) ? q.options.length : 4,
      imageUrl: q.image_url,
      timeLimit: game.totalTime,
      settings: {
        showQuestionsOnStudent: showQText,
        showOptionsTextOnStudent: showOptText
      }
    };

    // Ayar: Öğrenci ekranında soru metnini göster
    if (showQText) {
      studentPayload.questionText = q.question_text;
    }

    // Ayar: Öğrenci butonlarında şık metinlerini göster
    if (showOptText && Array.isArray(q.options)) {
      studentPayload.options = q.options;
    }

    // Sıralama sorusu ise: Öğrenciye maddeleri rastgele karıştırılmış olarak gönder
    if (q.question_type === 'order' && Array.isArray(q.options)) {
      const itemsWithOriginalIdx = q.options.map((opt, idx) => ({ id: idx, text: opt }));
      // Fisher-Yates Karıştırma
      for (let i = itemsWithOriginalIdx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [itemsWithOriginalIdx[i], itemsWithOriginalIdx[j]] = [itemsWithOriginalIdx[j], itemsWithOriginalIdx[i]];
      }
      studentPayload.shuffledItems = itemsWithOriginalIdx;
    }

    // Görsel seçmeli soru ise: Görselleri ve metinleri öğrenci ekranına da gönder
    if (q.question_type === 'image_choice' && Array.isArray(q.options)) {
      studentPayload.imageOptions = q.options;
    }

    io.to(sId).emit('player:question_start', studentPayload);
  }

  game.timer = setInterval(() => {
    game.timeLeft--;

    io.to(game.pin).emit('game:timer_tick', {
      timeLeft: game.timeLeft,
      totalTime: game.totalTime
    });

    if (game.timeLeft <= 0) {
      endQuestion(game);
    }
  }, 1000);
}

function endQuestion(game) {
  if (game.timer) {
    clearInterval(game.timer);
    game.timer = null;
  }

  if (game.status !== 'QUESTION') return;
  game.status = 'SUMMARY';

  const q = game.questions[game.currentQuestionIndex];
  const qIdx = game.currentQuestionIndex;

  // İstatistikleri Derle
  const optionCounts = new Array(Array.isArray(q.options) ? q.options.length : 4).fill(0);
  const textAnswersSummary = []; // Boşluk doldurma cevapları

  for (const player of game.players.values()) {
    const ans = player.answers[qIdx];
    if (!ans) continue;

    if (q.question_type === 'fill_blank') {
      textAnswersSummary.push({
        text: ans.submittedVal,
        isCorrect: ans.isCorrect
      });
    } else if (q.question_type === 'multiselect') {
      if (Array.isArray(ans.submittedVal)) {
        ans.submittedVal.forEach(idx => {
          if (idx >= 0 && idx < optionCounts.length) optionCounts[idx]++;
        });
      }
    } else if (typeof ans.submittedVal === 'number' || typeof ans.submittedVal === 'string') {
      const idx = parseInt(ans.submittedVal);
      if (!isNaN(idx) && idx >= 0 && idx < optionCounts.length) {
        optionCounts[idx]++;
      }
    }
  }

  const sortedPlayers = Array.from(game.players.values()).sort((a, b) => b.score - a.score);

  const top5 = sortedPlayers.slice(0, 5).map((p, idx) => ({
    rank: idx + 1,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    streak: p.streak,
    lastEarned: p.lastEarned
  }));

  const isLastQuestion = (game.currentQuestionIndex >= game.questions.length - 1);

  // Doğru Cevabın İnsan Tarafından Okunabilir Özeti
  let humanReadableCorrect = '';
  if (q.question_type === 'fill_blank') {
    humanReadableCorrect = Array.isArray(q.correct_option) ? q.correct_option.join(' / ') : q.correct_option;
  } else if (q.question_type === 'order') {
    humanReadableCorrect = '1. ' + (q.options ? q.options.join(' ➔ ') : '');
  } else if (q.question_type === 'multiselect') {
    const targetIdxs = Array.isArray(q.correct_option) ? q.correct_option : [];
    humanReadableCorrect = targetIdxs.map(i => q.options[i]).join(', ');
  } else if (q.question_type === 'image_choice') {
    const correctIdx = parseInt(q.correct_option);
    humanReadableCorrect = q.options[correctIdx] ? q.options[correctIdx].text : '';
  } else {
    const correctIdx = parseInt(q.correct_option);
    humanReadableCorrect = q.options[correctIdx] || '';
  }

  // Host Özeti
  io.to(game.hostSocketId).emit('host:question_summary', {
    questionIndex: qIdx,
    questionType: q.question_type,
    correctOption: q.correct_option,
    humanReadableCorrect,
    optionCounts,
    textAnswersSummary,
    totalAnswers: game.answersReceived,
    totalPlayers: game.players.size,
    leaderboard: top5,
    isLastQuestion
  });

  // Oyuncu Kişisel Sonuçları
  sortedPlayers.forEach((p, idx) => {
    const ans = p.answers[qIdx];
    const isCorrect = ans ? ans.isCorrect : false;
    const earnedPoints = ans ? ans.earnedPoints : 0;
    const rank = idx + 1;

    io.to(p.socketId).emit('player:question_result', {
      isCorrect,
      earnedPoints,
      totalScore: p.score,
      streak: p.streak,
      rank,
      totalPlayers: sortedPlayers.length,
      correctOption: q.correct_option,
      humanReadableCorrect
    });
  });
}

function finishGame(game) {
  if (game.timer) clearInterval(game.timer);
  game.status = 'PODIUM';

  const sortedPlayers = Array.from(game.players.values()).sort((a, b) => b.score - a.score);

  // Veritabanına kalıcı olarak kaydet
  if (game.dbSessionId) {
    try {
      db.prepare(`
        UPDATE game_sessions 
        SET player_count = ?, finished_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(sortedPlayers.length, game.dbSessionId);

      const insertPlayer = db.prepare(`
        INSERT INTO game_players (game_session_id, nickname, avatar, total_score, final_rank, correct_count, wrong_count, accuracy_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertAnswer = db.prepare(`
        INSERT INTO game_answers (game_session_id, player_id, question_index, question_text, question_type, submitted_answer, is_correct, earned_points, response_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      sortedPlayers.forEach((p, idx) => {
        let correctCount = 0;
        let wrongCount = 0;
        game.questions.forEach((q, qIdx) => {
          const ans = p.answers[qIdx];
          if (ans && ans.isCorrect) correctCount++;
          else wrongCount++;
        });
        const totalQ = game.questions.length;
        const accuracyPct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

        const playerResult = insertPlayer.run(
          game.dbSessionId,
          p.nickname,
          p.avatar,
          p.score,
          idx + 1,
          correctCount,
          wrongCount,
          accuracyPct
        );
        const pId = playerResult.lastInsertRowid;

        // Cevapları kaydet
        game.questions.forEach((q, qIdx) => {
          const ans = p.answers[qIdx];
          let submittedText = '-';
          let isCorr = 0;
          let pts = 0;
          let timeMs = 0;

          if (ans) {
            isCorr = ans.isCorrect ? 1 : 0;
            pts = ans.earnedPoints || 0;
            timeMs = ans.timeSpentMs || 0;

            if (q.question_type === 'fill_blank') {
              submittedText = String(ans.submittedVal || '');
            } else if (q.question_type === 'order') {
              if (Array.isArray(ans.submittedVal) && Array.isArray(q.options)) {
                submittedText = ans.submittedVal.map(i => q.options[i] || i).join(' ➔ ');
              } else {
                submittedText = JSON.stringify(ans.submittedVal);
              }
            } else if (q.question_type === 'multiselect') {
              if (Array.isArray(ans.submittedVal) && Array.isArray(q.options)) {
                submittedText = ans.submittedVal.map(i => q.options[i] || i).join(', ');
              } else {
                submittedText = JSON.stringify(ans.submittedVal);
              }
            } else if (q.question_type === 'image_choice') {
              const opt = q.options[ans.submittedVal];
              submittedText = opt ? (opt.text || opt) : String(ans.submittedVal);
            } else {
              submittedText = q.options[ans.submittedVal] || String(ans.submittedVal);
            }
          }

          insertAnswer.run(
            game.dbSessionId,
            pId,
            qIdx,
            q.question_text,
            q.question_type,
            submittedText,
            isCorr,
            pts,
            timeMs
          );
        });
      });
      console.log(`📊 Oturum #${game.dbSessionId} sonuçları veritabanına kaydedildi.`);
    } catch (dbErr) {
      console.error('Oturum veritabanına kaydedilirken hata:', dbErr);
    }
  }

  const podium = {
    first: sortedPlayers[0] || null,
    second: sortedPlayers[1] || null,
    third: sortedPlayers[2] || null,
    allPlayers: sortedPlayers.map((p, idx) => ({
      rank: idx + 1,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score
    }))
  };

  io.to(game.pin).emit('game:final_results', {
    quizTitle: game.quizTitle,
    sessionId: game.dbSessionId,
    podium
  });
}

// ----------------------------------------------------
// 5. SUNUCUYU BAŞLAT
// ----------------------------------------------------
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 QuizLem (Gelişmiş Soru Tipleri) Çalışıyor!`);
  console.log(`📍 Web Arayüzü: http://localhost:${PORT}`);
  console.log(`🔑 Demo Öğretmen Girişi: ogretmen / 123456`);
  console.log(`====================================================`);
});
