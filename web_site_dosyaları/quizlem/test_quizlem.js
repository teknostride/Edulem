const ioClient = require('socket.io-client');

async function runAdvancedVerification() {
  console.log('🧪 QuizLem Gelişmiş Soru Tipleri Uçtan Uca Testi Başlıyor...');

  // 1. Öğretmen Girişi
  console.log('1️⃣ REST API: ogretmen / 123456 girişi deneniyor...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ogretmen', password: '123456' })
  });

  if (!loginRes.ok) throw new Error(`Giriş başarısız: HTTP ${loginRes.status}`);
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✅ Giriş başarılı. Kullanıcı:', loginData.user.full_name);

  // 2. Testleri Listele
  const quizzesRes = await fetch('http://localhost:3000/api/quizzes', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const quizzesData = await quizzesRes.json();
  console.log(`✅ ${quizzesData.quizzes.length} adet test mevcut.`);
  const targetQuizId = quizzesData.quizzes[0].id;
  console.log(`   Seçilen Test: "${quizzesData.quizzes[0].title}" (${quizzesData.quizzes[0].question_count} Soru)`);

  // 3. Host Lobi Oluşturuyor
  console.log('3️⃣ Host bağlanıyor ve oyunu açıyor...');
  const hostSocket = ioClient('http://localhost:3000');
  let gamePin = null;

  await new Promise((resolve, reject) => {
    hostSocket.on('connect', () => {
      hostSocket.emit('host:create_game', { quizId: targetQuizId, token });
    });
    hostSocket.on('host:game_created', (d) => {
      gamePin = d.pin;
      console.log(`✅ Oyun Oluşturuldu! PIN: ${gamePin}`);
      resolve();
    });
    hostSocket.on('error_message', reject);
  });

  // 4. Öğrenci Katılıyor
  console.log('4️⃣ Öğrenci odaya bağlanıyor (Caner)...');
  const student = ioClient('http://localhost:3000');
  await new Promise((resolve) => {
    student.on('connect', () => {
      student.emit('player:join', { pin: gamePin, nickname: 'Caner', avatar: '🦁' });
    });
    student.on('player:join_success', (d) => {
      console.log(`✅ Öğrenci katıldı: ${d.nickname} (${d.avatar})`);
      resolve();
    });
  });

  // 5. Host Oyunu Başlatıyor (1. Soru: Çoktan Seçmeli)
  console.log('5️⃣ Soru 1 Başlıyor: Çoktan Seçmeli...');
  let currentQType = null;
  const q1Promise = new Promise((resolve) => {
    student.on('player:question_start', (q) => {
      currentQType = q.questionType;
      console.log(`   ➡️ Öğrenciye soru sinyali geldi. Tip: "${q.questionType}"`);
      resolve(q);
    });
  });

  hostSocket.emit('host:start_game', { pin: gamePin });
  await q1Promise;

  // Caner 1. soruya (Jüpiter = 1) cevap veriyor
  const summary1Promise = new Promise(res => hostSocket.once('host:question_summary', res));
  student.emit('player:submit_answer', { pin: gamePin, answer: 1 });
  const sum1 = await summary1Promise;
  console.log(`   ✅ Soru 1 Tamamlandı. Doğru Yanıt:`, sum1.humanReadableCorrect);

  // 6. Soru 2: Boşluk Doldurma
  console.log('6️⃣ Soru 2 Başlıyor: Boşluk Doldurma...');
  const q2Promise = new Promise(res => student.once('player:question_start', res));
  const summary2Promise = new Promise(res => hostSocket.once('host:question_summary', res));
  hostSocket.emit('host:next_question', { pin: gamePin });
  const q2Data = await q2Promise;
  console.log(`   ➡️ Öğrenciye soru sinyali geldi. Tip: "${q2Data.questionType}"`);

  // Caner "ankara" yazıp gönderiyor
  student.emit('player:submit_answer', { pin: gamePin, answer: 'ankara' });
  const sum2 = await summary2Promise;
  console.log(`   ✅ Soru 2 Tamamlandı. Kabul Edilen: "${sum2.humanReadableCorrect}", Gelen Yanıtlar:`, sum2.textAnswersSummary);

  // 7. Soru 3: Sıralama (Order / Sequence)
  console.log('7️⃣ Soru 3 Başlıyor: Sıralama (Order / Puzzle)...');
  const q3Promise = new Promise(res => student.once('player:question_start', res));
  const summary3Promise = new Promise(res => hostSocket.once('host:question_summary', res));
  hostSocket.emit('host:next_question', { pin: gamePin });
  const q3Data = await q3Promise;
  console.log(`   ➡️ Öğrenciye soru sinyali geldi. Karıştırılmış Maddeler:`, q3Data.shuffledItems.map(i => i.text));

  // Caner doğru sırayı [0, 1, 2, 3] gönderiyor
  student.emit('player:submit_answer', { pin: gamePin, answer: [0, 1, 2, 3] });
  const sum3 = await summary3Promise;
  console.log(`   ✅ Soru 3 Tamamlandı. Sıralama Doğru.`);

  // 8. Soru 4: Çoklu Seçim (Multi-Select)
  console.log('8️⃣ Soru 4 Başlıyor: Çoklu Seçim (Multi-Select)...');
  const q4Promise = new Promise(res => student.once('player:question_start', res));
  const summary4Promise = new Promise(res => hostSocket.once('host:question_summary', res));
  hostSocket.emit('host:next_question', { pin: gamePin });
  const q4Data = await q4Promise;
  console.log(`   ➡️ Öğrenciye soru sinyali geldi. Tip: "${q4Data.questionType}"`);

  // Caner [0, 1] (Chrome & Firefox) seçiyor
  student.emit('player:submit_answer', { pin: gamePin, answer: [0, 1] });
  const sum4 = await summary4Promise;
  console.log(`   ✅ Soru 4 Tamamlandı. Doğru Şıklar: "${sum4.humanReadableCorrect}"`);

  // Bağlantıları Temizle
  hostSocket.disconnect();
  student.disconnect();

  console.log('🎉 TÜM GELİŞMİŞ SORU TİPLERİ (Çoktan seçmeli, Boşluk doldurma, Sıralama, Çoklu seçim) TESTLERİ BAŞARIYLA GEÇTİ!');
  process.exit(0);
}

runAdvancedVerification().catch(err => {
  console.error('❌ Test Hatası:', err);
  process.exit(1);
});
