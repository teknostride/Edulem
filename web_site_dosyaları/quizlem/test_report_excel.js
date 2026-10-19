const ioClient = require('socket.io-client');
const fs = require('fs');

async function testReportAndExcel() {
  console.log('🧪 Raporlama ve Excel Dışa Aktarma Uçtan Uca Doğrulama Testi Başlıyor...');

  // 1. Giriş
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ogretmen', password: '123456' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // 2. Testleri Al
  const quizzesRes = await fetch('http://localhost:3000/api/quizzes', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const quizzesData = await quizzesRes.json();
  const targetQuizId = quizzesData.quizzes[0].id;

  // 3. Oyun Aç
  const hostSocket = ioClient('http://localhost:3000');
  let gamePin = null;
  let sessionId = null;

  await new Promise(resolve => {
    hostSocket.on('connect', () => {
      hostSocket.emit('host:create_game', { quizId: targetQuizId, token });
    });
    hostSocket.on('host:game_created', (d) => {
      gamePin = d.pin;
      sessionId = d.sessionId;
      console.log(`✅ Oyun Oluşturuldu! PIN: ${gamePin}, Oturum ID: ${sessionId}`);
      resolve();
    });
  });

  // 4. İki Öğrenci Katılsın: Ali (🦁), Zeynep (🦄)
  function join(nick, avatar) {
    return new Promise(resolve => {
      const s = ioClient('http://localhost:3000');
      const emit = () => s.emit('player:join', { pin: gamePin, nickname: nick, avatar });
      if (s.connected) emit();
      else s.on('connect', emit);
      s.on('player:join_success', () => resolve(s));
    });
  }

  const s1 = await join('Ali', '🦁');
  const s2 = await join('Zeynep', '🦄');
  console.log('✅ Öğrenciler katıldı.');

  // 5. Başlat ve Soruları Tamamla
  const qStart1 = new Promise(res => s1.once('player:question_start', res));
  hostSocket.emit('host:start_game', { pin: gamePin });
  await qStart1;

  // Soru 1: Ali doğru (1), Zeynep yanlış (0)
  const sum1 = new Promise(res => hostSocket.once('host:question_summary', res));
  s1.emit('player:submit_answer', { pin: gamePin, answer: 1 });
  s2.emit('player:submit_answer', { pin: gamePin, answer: 0 });
  await sum1;

  // Soruları bitirip podyuma geç
  let isLast = false;
  while (!isLast) {
    const qWait = new Promise(res => s1.once('player:question_start', res));
    const sumWait = new Promise(res => hostSocket.once('host:question_summary', res));
    hostSocket.emit('host:next_question', { pin: gamePin });
    await qWait;

    s1.emit('player:submit_answer', { pin: gamePin, answer: 0 });
    s2.emit('player:submit_answer', { pin: gamePin, answer: 1 });
    const sData = await sumWait;
    isLast = sData.isLastQuestion;
  }

  // Podyum
  const finalProm = new Promise(res => hostSocket.once('game:final_results', res));
  hostSocket.emit('host:next_question', { pin: gamePin });
  const finalData = await finalProm;
  console.log('✅ Oyun Bitti. Final Verisi Geldi. Oturum ID:', finalData.sessionId);

  hostSocket.disconnect();
  s1.disconnect();
  s2.disconnect();

  // 6. REST API: GET /api/reports test
  console.log('🔍 GET /api/reports çağrılıyor...');
  const reportsRes = await fetch('http://localhost:3000/api/reports', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!reportsRes.ok) throw new Error(`Reports API hatası: HTTP ${reportsRes.status}`);
  const reportsData = await reportsRes.json();
  console.log(`✅ ${reportsData.reports.length} adet rapor listelendi.`);
  const myReport = reportsData.reports.find(r => r.id === finalData.sessionId);
  if (!myReport) throw new Error('Yeni biten oturum rapor listesinde bulunamadı!');
  console.log(`   Rapor Başlığı: "${myReport.quiz_title}", Kazanan: ${myReport.winner_name} (${myReport.winner_score} P)`);

  // 7. REST API: GET /api/reports/:id test
  console.log(`🔍 GET /api/reports/${myReport.id} detay çağrılıyor...`);
  const detailRes = await fetch(`http://localhost:3000/api/reports/${myReport.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!detailRes.ok) throw new Error(`Detail API hatası: HTTP ${detailRes.status}`);
  const detailData = await detailRes.json();
  console.log(`✅ Detay Alındı. Oyuncu Sayısı: ${detailData.players.length}, Toplam Soru: ${detailData.questions.length}, Cevap Kaydı: ${detailData.answers.length}`);

  // 8. REST API: GET /api/reports/:id/excel test
  console.log(`📊 GET /api/reports/${myReport.id}/excel indirme çağrılıyor...`);
  const excelRes = await fetch(`http://localhost:3000/api/reports/${myReport.id}/excel`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!excelRes.ok) throw new Error(`Excel API hatası: HTTP ${excelRes.status}`);
  const excelBuffer = await excelRes.arrayBuffer();
  console.log(`✅ Excel Dosyası İndirildi! Boyut: ${excelBuffer.byteLength} bayt`);

  // Excel dosyasını doğrulamak için XLSX ile oku
  const XLSX = require('xlsx');
  const wb = XLSX.read(Buffer.from(excelBuffer), { type: 'buffer' });
  console.log('✅ Excel Çalışma Sayfaları:', wb.SheetNames);

  if (!wb.SheetNames.includes('Genel Sıralama') || !wb.SheetNames.includes('Cevap Matrisi') || !wb.SheetNames.includes('Soru Analizi')) {
    throw new Error('Beklenen 3 çalışma sayfası Excel dosyasında eksik!');
  }

  console.log('🎉 RAPORLAMA VE ÇOK SAYFALI EXCEL (.xlsx) TESTİ EKSİKSİZ BAŞARIYLA GEÇTİ!');
  process.exit(0);
}

testReportAndExcel().catch(err => {
  console.error('❌ Test Hatası:', err);
  process.exit(1);
});
