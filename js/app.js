// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCek7bTb6WlbJw5Xjmvsk4hSvWAQ_g7yPs",
    authDomain: "un-viaje-nuevo.firebaseapp.com",
    projectId: "un-viaje-nuevo",
    storageBucket: "un-viaje-nuevo.firebasestorage.app",
    messagingSenderId: "872379280680",
    appId: "1:872379280680:web:c7b09f71760bfe44dcf41d",
    measurementId: "G-J021Q5QKX6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Función para verificar si el usuario está en una sala activa
async function checkActiveRoom(userId) {
    const salasRef = collection(db, "salas");
    const q = query(
        salasRef, 
        where("miembros", "array-contains", userId),
        where("estado", "==", "activa")
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}

// Función para redirigir según el estado del usuario
async function redirectUser(userId) {
    try {
        const hasActiveRoom = await checkActiveRoom(userId);
        if (hasActiveRoom) {
            window.location.href = "html/gallery_photos.html";
        } else {
            window.location.href = "test/dashboard.html";
        }
    } catch (error) {
        console.error("Error checking room status:", error);
        // Por defecto, redirigir al dashboard si hay un error
        window.location.href = "html/dashboard.html";
    }
}

//enviar a la pagina de registro si le da al boton de registrarse
document.getElementById('registerButton').addEventListener('click', () => {
    window.location.href = "html/register.html";
});

// Manejar el inicio de sesión por correo
document.getElementById('loginButton').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('error');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await redirectUser(userCredential.user.uid);
    } catch (error) {
        console.error(error);
        errorElement.style.display = "block";
    }
});

// Manejar el inicio de sesión con Google
document.getElementById('googleSignIn').addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await redirectUser(result.user.uid);
    } catch (error) {
        console.error(error);
        document.getElementById('error').style.display = "block";
    }
});