const ioClient = require('socket.io-client');

async function testPodiumFlow() {
  console.log('🧪 Podyum ve Final Sonuçları Doğrulama Testi Başlıyor...');

  // 1. Öğretmen Girişi
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ogretmen', password: '123456' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // 2. Testleri Listele
  const quizzesRes = await fetch('http://localhost:3000/api/quizzes', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const quizzesData = await quizzesRes.json();
  const targetQuizId = quizzesData.quizzes[0].id;
  console.log(`✅ Test Seçildi: "${quizzesData.quizzes[0].title}"`);

  // 3. Host Lobi Oluşturuyor
  const hostSocket = ioClient('http://localhost:3000');
  let gamePin = null;

  await new Promise((resolve, reject) => {
    const emitCreate = () => hostSocket.emit('host:create_game', { quizId: targetQuizId, token });
    if (hostSocket.connected) emitCreate();
    else hostSocket.on('connect', emitCreate);

    hostSocket.on('host:game_created', (d) => {
      gamePin = d.pin;
      console.log(`✅ Oyun Oluşturuldu! PIN: ${gamePin}`);
      resolve();
    });
    hostSocket.on('error_message', reject);
  });

  // 4. 3 Öğrenci Katılıyor: Caner (🦁), Ayşe (🦄), Mehmet (🚀)
  function connectAndJoin(nick, avatar) {
    return new Promise((resolve, reject) => {
      const socket = ioClient('http://localhost:3000');
      const emitJoin = () => socket.emit('player:join', { pin: gamePin, nickname: nick, avatar });
      if (socket.connected) emitJoin();
      else socket.on('connect', emitJoin);

      socket.on('player:join_success', (d) => {
        console.log(`   👤 Katıldı: ${d.nickname} (${d.avatar})`);
        resolve({ nick, avatar, client: socket });
      });
      socket.on('player:join_error', reject);
    });
  }

  const students = [
    await connectAndJoin('Caner', '🦁'),
    await connectAndJoin('Ayşe', '🦄'),
    await connectAndJoin('Mehmet', '🚀')
  ];

  // 5. Host Oyunu Başlatıyor
  console.log('🚀 Oyun Başlatılıyor...');
  const startPromises = students.map(s => new Promise(res => s.client.once('player:question_start', res)));
  hostSocket.emit('host:start_game', { pin: gamePin });
  await Promise.all(startPromises);

  // Soru 1: Caner ve Ayşe doğru veriyor, Mehmet yanlış veriyor
  const sumPromise1 = new Promise(res => hostSocket.once('host:question_summary', res));
  students[0].client.emit('player:submit_answer', { pin: gamePin, answer: 1 });
  students[1].client.emit('player:submit_answer', { pin: gamePin, answer: 1 });
  students[2].client.emit('player:submit_answer', { pin: gamePin, answer: 0 });
  await sumPromise1;
  console.log('   ✅ Soru 1 tamamlandı.');

  // Sonraki soruları geçerek final podyumuna ulaşalım
  let isLast = false;
  let questionCount = 1;
  while (!isLast) {
    questionCount++;
    const qPromise = new Promise(res => students[0].client.once('player:question_start', res));
    const sumPromise = new Promise(res => hostSocket.once('host:question_summary', res));
    
    hostSocket.emit('host:next_question', { pin: gamePin });
    await qPromise;

    // Hızlı cevaplar: Caner hep 0, Ayşe 1, Mehmet 2
    students[0].client.emit('player:submit_answer', { pin: gamePin, answer: 0 });
    students[1].client.emit('player:submit_answer', { pin: gamePin, answer: 1 });
    students[2].client.emit('player:submit_answer', { pin: gamePin, answer: 2 });

    const summary = await sumPromise;
    isLast = summary.isLastQuestion;
    console.log(`   ✅ Soru ${questionCount} tamamlandı. Son soru mu: ${isLast}`);
  }

  // 6. Son sorudan sonra 'host:next_question' gönderilerek Podyuma geçilir!
  console.log('🏁 Final Sorusundan sonra Podyum çağrılıyor...');
  const hostPodiumPromise = new Promise(res => hostSocket.once('game:final_results', res));
  const studentPodiumPromise = new Promise(res => students[0].client.once('game:final_results', res));

  hostSocket.emit('host:next_question', { pin: gamePin });

  const hostResults = await hostPodiumPromise;
  const studentResults = await studentPodiumPromise;

  console.log('🎉 Podyum Verisi Alındı!');
  console.log('   🥇 1. Sıra (Şampiyon):', hostResults.podium.first ? `${hostResults.podium.first.nickname} (${hostResults.podium.first.score} P)` : 'Yok');
  console.log('   🥈 2. Sıra:', hostResults.podium.second ? `${hostResults.podium.second.nickname} (${hostResults.podium.second.score} P)` : 'Yok');
  console.log('   🥉 3. Sıra:', hostResults.podium.third ? `${hostResults.podium.third.nickname} (${hostResults.podium.third.score} P)` : 'Yok');
  console.log('   📋 Toplam Sıralanan Oyuncu:', hostResults.podium.allPlayers.length);

  if (!hostResults.podium.first) {
    throw new Error('Podyum 1. sırası boş geldi!');
  }

  // Temizlik
  hostSocket.disconnect();
  students.forEach(s => s.client.disconnect());

  console.log('✅ PODYUM VE FİNAL SONUÇLARI BAŞARIYLA DOĞRULANDI!');
  process.exit(0);
}

testPodiumFlow().catch(err => {
  console.error('❌ Test Hatası:', err);
  process.exit(1);
});
