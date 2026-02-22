// Firebase Messaging Service Worker
// Este arquivo é necessário para receber notificações em background (app fechado/minimizado)
// Deve estar na raiz pública para ter escopo total da origem

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

// Configuração do Firebase (deve corresponder ao projeto)
// Não usar variáveis de ambiente aqui — service workers não têm acesso ao Vite
firebase.initializeApp({
    apiKey: 'AIzaSyCxUSEG5Z2qPkhLsjbcVcVDqRwM4vV-uso',
    authDomain: 'controle-contas-ac4.firebaseapp.com',
    projectId: 'controle-contas-ac4',
    storageBucket: 'controle-contas-ac4.firebasestorage.app',
    messagingSenderId: '75975533820',
    appId: '1:75975533820:web:85873e32ff94fa622f2379',
});

const messaging = firebase.messaging();

// Tratar mensagens recebidas em background
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message:', payload);

    const notificationTitle = payload.notification?.title ?? 'Gestão AC-4 Pro';
    const notificationOptions = {
        body: payload.notification?.body ?? 'Você tem um plantão em breve.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: payload.data?.shiftId ?? 'shift-reminder', // Agrupa notificações do mesmo plantão
        data: payload.data,
        actions: [
            { action: 'view', title: 'Ver Escalas' },
        ],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Ao clicar na notificação, abrir/focar o app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = self.location.origin + '/escalas';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se o app já está aberto, focar nele
            for (const client of clientList) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Caso contrário, abrir nova janela
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
