// Importar las funciones necesarias desde los módulos de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-storage.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-firestore.js";

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const firestore = getFirestore(app);

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = document.getElementById('fileInput').files[0];
    const description = document.getElementById('description').value;
    const whoTook = document.getElementById('whoTook').value;
    const location = document.getElementById('location').value;

    if (file) {
        // Mostrar mensaje de estado
        document.getElementById('statusMessage').textContent = 'Subiendo foto...';

        // Crear una referencia para el archivo en Firebase Storage
        const storageRef = ref(storage, 'photos/' + file.name);

        // Subir la foto
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', (snapshot) => {
            // Progreso de la carga (opcional)
        }, (error) => {
            console.error(error);
            document.getElementById('statusMessage').textContent = 'Error al subir la foto.';
        }, async () => {
            // Obtener la URL de la imagen subida
            const imageURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Subir los datos a Firestore
            await addDoc(collection(firestore, 'photos'), {
                imageUrl: imageURL,
                description: description,
                whoTook: whoTook,
                location: location,
                timestamp: serverTimestamp()  // Marca de tiempo
            });

            // Mensaje de éxito
            document.getElementById('statusMessage').textContent = 'Foto subida exitosamente';
        });
    }
});
