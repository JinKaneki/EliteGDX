// Firebase configuration for Elite Gems Dashboard
const firebaseConfig = {
    apiKey: "AIzaSyBZ0VgXievcXKNKQyFusrZe8ohnFn98Z8A",
    authDomain: "firegdx.firebaseapp.com",
    databaseURL: "https://firegdx-default-rtdb.firebaseio.com",
    projectId: "firegdx",
    storageBucket: "firegdx.firebasestorage.app",
    messagingSenderId: "167830327568",
    appId: "1:167830327568:web:da4d30c9dca57b3da11595"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();