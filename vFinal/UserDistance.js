import { db, auth } from './firebaseConfig.js'; // Usa db y auth desde firebaseConfig.js
import { doc, updateDoc, onSnapshot, collection, query, where } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCek7bTb6WlbJw5Xjmvsk4hSvWAQ_g7yPs",
    authDomain: "un-viaje-nuevo.firebaseapp.com",
    projectId: "un-viaje-nuevo",
    storageBucket: "un-viaje-nuevo.firebasestorage.app",
    messagingSenderId: "872379280680",
    appId: "1:872379280680:web:c7b09f71760bfe44dcf41d",
    measurementId: "G-J021Q5QKX6"
};



async function updateUserLocation(roomId) {
    if (navigator.geolocation && auth.currentUser) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            console.log("Ubicación obtenida:", position.coords.latitude, position.coords.longitude);

            const userRef = doc(db, "usuarios", auth.currentUser.uid);
            await updateDoc(userRef, {
                currentRoom: roomId,
                location: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    lastUpdated: new Date()
                }
            });
        }, (error) => {
            console.error("Error obteniendo ubicación:", error);
        });
    } else {
        console.warn("Geolocalización no soportada o usuario no autenticado.");
    }
}
console.log("Usuario autenticado:", auth.currentUser);


function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

function trackUsersDistance(roomId) {
    if (!roomId || !auth.currentUser) return;

    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("currentRoom", "==", roomId));
    
    onSnapshot(q, (snapshot) => {
        const userData = snapshot.docs.filter(doc => doc.data().location).map(doc => ({
            name: doc.data().nombre,
            location: doc.data().location
        }));
        
        if (userData.length === 2) {
            const distance = calculateDistance(
                userData[0].location.latitude, userData[0].location.longitude,
                userData[1].location.latitude, userData[1].location.longitude
            );
            
            displayDistance(userData[0].name, userData[1].name, distance, roomId);
        }
    });
}

function displayDistance(user1, user2, distance, roomId) {
    let container = document.getElementById('user-distance-root');
    if (!container) {
        container = document.createElement('div');
        container.id = 'user-distance-root';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.left = '20px';
        container.style.background = 'white';
        container.style.padding = '10px';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        container.style.cursor = 'pointer';
        document.body.appendChild(container);
    }
    container.innerHTML = `<h3>Distancia entre usuarios</h3><p>${user1} y ${user2}</p><p><strong>${distance} km</strong></p>`;
    container.onclick = () => {
        window.location.href = `location.html?id_sala=${roomId}`;
    };
}

const params = new URLSearchParams(window.location.search);
const roomId = params.get('id_sala');
if (roomId) {
    updateUserLocation(roomId);
    trackUsersDistance(roomId);
}