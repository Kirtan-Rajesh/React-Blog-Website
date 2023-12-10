// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {GoogleAuthProvider, getAuth, signInWithPopup} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWO7rkA0qXmkrPnyNXlg3Cm2WA7HvnsI8",
  authDomain: "react-js-blog-website-ffa4d.firebaseapp.com",
  projectId: "react-js-blog-website-ffa4d",
  storageBucket: "react-js-blog-website-ffa4d.appspot.com",
  messagingSenderId: "24451828728",
  appId: "1:24451828728:web:b7d091c2874d633745240d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//google auth

const provider =new GoogleAuthProvider();

const auth=getAuth();

export const authWithGoogle = async() =>{
    let user=null;

    await signInWithPopup(auth,provider)
    .then((result)=>{
        user=result.user
    })
    .catch((err)=>{
        console.log(err)
    })
    return user;
}