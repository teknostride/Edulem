/**
 * test_advanced_features.js
 * QuizLem - 4 Yeni Gelişmiş Özelliğin Uçtan Uca Entegrasyon Testi
 * 1. "Diğer" Kategorisi
 * 2. PNG / JPG Base64 Görsel Yükleme API'si (/api/upload)
 * 3. Gelişmiş Yarışma Ayarları (Soru/Görsel & Şık Metinlerini Öğrenciye İletme)
 * 4. Canlı Ses Yayını WebRTC Sinyalleşme ve Relay Motoru
 */

const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 QuizLem 4 Gelişmiş Özellik Doğrulama Testi Başlıyor');
  console.log('====================================================');

  // 1. Öğretmen Girişi
  console.log('\n[TEST 1] Öğretmen Girişi ve Token Alma...');
  const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ogretmen', password: '123456' })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    throw new Error('Öğretmen girişi başarısız: ' + JSON.stringify(loginData));
  }
  const teacherToken = loginData.token;
  console.log('  ✅ Öğretmen girişi başarılı. Token alındı.');

  // 2. PNG / JPG Görsel Yükleme Testi (/api/upload)
  console.log('\n[TEST 2] PNG / JPG Görsel Yükleme (/api/upload)...');
  // 1x1 transparan/kırmızı PNG data URL
  const sampleBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  const uploadRes = await fetch(`${SERVER_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    },
    body: JSON.stringify({ image: sampleBase64Png, name: 'test_red_pixel.png' })
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.url) {
    throw new Error('Görsel yükleme API hatası: ' + JSON.stringify(uploadData));
  }
  console.log(`  ✅ Görsel yüklendi: ${uploadData.url}`);

  // Fiziksel dosyanın public/uploads altında olduğunu doğrula
  const physicalPath = path.join(__dirname, 'public', uploadData.url);
  if (!fs.existsSync(physicalPath)) {
    throw new Error('Yüklenen görsel diskte bulunamadı: ' + physicalPath);
  }
  const stat = fs.statSync(physicalPath);
  if (stat.size <= 0) {
    throw new Error('Diskteki görsel boyutu 0 byte!');
  }
  console.log(`  ✅ Fiziksel dosya doğrulandı (${stat.size} byte, ${physicalPath}).`);

  // 3. "Diğer" Kategorisinde Test Oluşturma
  console.log('\n[TEST 3] "Diğer" Kategorisinde Test Oluşturma...');
  const createQuizRes = await fetch(`${SERVER_URL}/api/quizzes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      title: 'İleri Seviye Karma Test (Diğer Kategorisi)',
      description: 'Yüklenen görsel ve yeni kategori testi',
      category: 'Diğer',
      cover_color: 'emerald',
      questions: [
        {
          question_text: 'Yüklenen görseldeki kırmızı piksel neyi temsil eder?',
          question_type: 'multiple',
          options: ['Piksel A', 'Piksel B', 'Piksel C', 'Piksel D'],
          correct_option: 0,
          image_url: uploadData.url,
          time_limit: 20,
          points_multiplier: 1
        }
      ]
    })
  });
  const createQuizData = await createQuizRes.json();
  if (!createQuizRes.ok || !createQuizData.quizId) {
    throw new Error('Quiz oluşturulamadı: ' + JSON.stringify(createQuizData));
  }
  const quizId = createQuizData.quizId;
  console.log(`  ✅ "Diğer" kategorisinde Quiz oluşturuldu (ID: ${quizId}).`);

  // Quiz'i API'den çekip kategorisini doğrula
  const getQuizRes = await fetch(`${SERVER_URL}/api/quizzes/${quizId}`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const getQuizData = await getQuizRes.json();
  if (getQuizData.quiz.category !== 'Diğer') {
    throw new Error(`Kategori beklentisi 'Diğer' ancak '${getQuizData.quiz.category}' geldi!`);
  }
  if (getQuizData.questions[0].image_url !== uploadData.url) {
    throw new Error(`Soru görsel URL'si eşleşmedi: ${getQuizData.questions[0].image_url}`);
  }
  console.log('  ✅ "Diğer" kategorisi ve görsel URL doğrulaması başarılı.');

  // 4. Socket.IO: Host Oyunu Açar, Ayarları Günceller ve Ses Sinyalleşmesi Test Edilir
  console.log('\n[TEST 4] Socket.IO: Host ve Öğrenci Bağlantısı & Ayarlar & Ses Sinyalleşmesi...');

  const hostSocket = io(SERVER_URL);
  const studentSocket = io(SERVER_URL);

  await new Promise((resolve, reject) => {
    let pinCode = null;

    hostSocket.on('connect', () => {
      console.log('  Host socket bağlandı:', hostSocket.id);
      hostSocket.emit('host:create_game', { quizId, token: teacherToken });
    });

    hostSocket.on('host:game_created', (data) => {
      pinCode = data.pin;
      console.log(`  ✅ Oyun oluşturuldu. PIN: ${pinCode}`);
      console.log('  Varsayılan Ayarlar:', data.settings);

      // Ayarları güncelle (Öğrenciye soruları ve şık metinlerini göstermeyi aç)
      hostSocket.emit('host:update_settings', {
        pin: pinCode,
        settings: {
          showQuestionsOnStudent: true,
          showOptionsTextOnStudent: true,
          shuffleQuestions: false,
          shuffleOptions: false
        }
      });
    });

    hostSocket.on('host:settings_updated', ({ settings }) => {
      console.log('  ✅ Ayarlar başarıyla güncellendi:', settings);
      if (!settings.showQuestionsOnStudent || !settings.showOptionsTextOnStudent) {
        return reject(new Error('Güncellenen ayarlar beklendiği gibi değil!'));
      }

      // Şimdi öğrenci bağlansın
      studentSocket.emit('player:join', {
        pin: pinCode,
        nickname: 'Akıllı Öğrenci',
        avatar: '🦊'
      });
    });

    studentSocket.on('player:join_success', (data) => {
      console.log(`  ✅ Öğrenci odaya katıldı: ${data.nickname} (PIN: ${data.pin})`);

      // 5. Ses Yayını Testi (WebRTC Relay)
      console.log('\n[TEST 5] Ses Yayını WebRTC Sinyalleşmesi...');
      // Host ses yayını başlattığını duyurur
      hostSocket.emit('voice:status', {
        pin: pinCode,
        isBroadcasting: true,
        hasMic: true,
        hasPcAudio: true
      });
    });

    // Öğrenci voice:status alır
    studentSocket.on('voice:status', (voiceData) => {
      console.log('  ✅ Öğrenci ses yayını bildirimini aldı:', voiceData);
      if (voiceData.isBroadcasting) {
        // Öğrenci dinleme isteği gönderir
        studentSocket.emit('voice:join_listen', { pin: pinCode });
      }
    });

    // Host yeni öğrenci dinleyiciyi görür ve Offer gönderir
    hostSocket.on('voice:student_joined', ({ studentSocketId }) => {
      console.log(`  ✅ Host: Öğrenci (${studentSocketId}) yayını dinlemek istiyor.`);
      hostSocket.emit('voice:offer', {
        to: studentSocketId,
        sdp: { type: 'offer', sdp: 'mock_host_sdp_audio_stream' }
      });
    });

    // Öğrenci Offer'ı alır ve Answer döner
    studentSocket.on('voice:offer', ({ sdp, from }) => {
      console.log(`  ✅ Öğrenci: Host'tan (${from}) WebRTC Offer aldı:`, sdp.type);
      studentSocket.emit('voice:answer', {
        to: from,
        sdp: { type: 'answer', sdp: 'mock_student_answer' }
      });
    });

    // Host Answer'ı alır
    hostSocket.on('voice:answer', ({ sdp, from }) => {
      console.log(`  ✅ Host: Öğrenciden (${from}) WebRTC Answer aldı:`, sdp.type);
      // ICE candidate relay'ini de test et
      hostSocket.emit('voice:candidate', {
        to: from,
        candidate: { candidate: 'mock_candidate_host', sdpMid: '0' }
      });
    });

    studentSocket.on('voice:candidate', ({ candidate }) => {
      console.log('  ✅ Öğrenci ICE Candidate relay aldı:', candidate.candidate);

      // Ses akışı ve ayarlar doğrulandı. Şimdi oyunu başlatalım!
      console.log('\n[TEST 6] Yarışmayı Başlatma & Öğrenci Ekranında Soru/Şık Metinleri Doğrulama...');
      hostSocket.emit('host:start_game', { pin: pinCode });
    });

    // Öğrenci soru başlangıcını alır
    studentSocket.on('player:question_start', (payload) => {
      console.log('  ✅ Öğrenci player:question_start aldı:');
      console.log('    - Soru No:', payload.questionIndex + 1);
      console.log('    - Soru Metni (Telefonda Görünüyor mu?):', payload.questionText);
      console.log('    - Soru Görseli:', payload.imageUrl);
      console.log('    - Şık Metinleri (Telefonda Yazıyor mu?):', payload.options);
      console.log('    - Ayarlar:', payload.settings);

      // KONTROLLER:
      if (!payload.questionText) {
        return reject(new Error('HATA: showQuestionsOnStudent açık olmasına rağmen soru metni öğrenciye iletilmedi!'));
      }
      if (!payload.imageUrl) {
        return reject(new Error('HATA: Soru görseli öğrenciye iletilmedi!'));
      }
      if (!Array.isArray(payload.options) || payload.options.length !== 4) {
        return reject(new Error('HATA: showOptionsTextOnStudent açık olmasına rağmen şık metinleri öğrenciye iletilmedi!'));
      }
      if (!payload.settings || !payload.settings.showQuestionsOnStudent || !payload.settings.showOptionsTextOnStudent) {
        return reject(new Error('HATA: Ayar durumları payload içinde eksik!'));
      }

      console.log('\n  🎉 TÜM DOĞRULAMALAR EKSİKSİZ GEÇTİ!');
      hostSocket.disconnect();
      studentSocket.disconnect();
      resolve();
    });

    setTimeout(() => {
      reject(new Error('Test zaman aşımına uğradı (15 saniye).'));
    }, 15000);
  });

  console.log('\n====================================================');
  console.log('🏆 BÜTÜN TESTLER BAŞARIYLA TAMAMLANDI (100% PASS)');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST HATASI:', err);
  process.exit(1);
});
