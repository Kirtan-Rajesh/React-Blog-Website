import { Link, Navigate } from "react-router-dom";
import InputBox from "../components/input.component";
import googleicon from "../imgs/google.png";
import AnimationWrapper from "../common/page-animation";
import { useContext, useRef } from "react";
import {toast, Toaster} from "react-hot-toast";
import axios from "axios";
import { storeInSession } from "../common/session";
import { UserContext } from "../App";
import { authWithGoogle } from "../common/firebase";

const UserAuthForm =({type}) => {

    const authForm = useRef();

    let {userAuth:{ access_token },setUserAuth}= useContext(UserContext)
    console.log(access_token);


    const userAuthThroughServer = (serverRoute,formData) =>{
        console.log("http://localhost:3000"+serverRoute);
        axios.post( "http://localhost:3000" + serverRoute , formData)
        .then(({data})=>{
            storeInSession("user", JSON.stringify(data))

            setUserAuth(data)
        })
        .catch(({response})=>{
            toast.error(response.data.error)
        })
        
}

    const handleSubmit=(e)=>{
        e.preventDefault();

        let serverRoute= type=== "sign-in" ? "/signin" : "/signup";

        // Regular expressions for email and password validation
        let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

        //form data
        let form=new FormData(formElement);
        let formData={};
        for(let [key,value] of form.entries()){
            formData[key]=value;
        }

        let {fullname,email,password}=formData;
        console.log(formData); 

        if(fullname){
        if (fullname.toString().length < 3) {
            return toast.error("Fullname should be more than 3 letters" );
        }
        }
    
        if (!email.length) {
            return toast.error( "Enter Email" );
        }
        if (!emailRegex.test(email)) {
            return toast.error( "Enter a Valid email" );
        }
        if (!passwordRegex.test(password)) {
            return toast.error( "Enter a Valid password. It should contain 1 uppercase, 1 numeric and 1 special character");
        }

        userAuthThroughServer(serverRoute, formData);
        
    }

    const handleGoogleAuth = (e) =>{
        e.preventDefault();

        authWithGoogle().then( user=>{
            let serverRoute="/google-auth";

            let formData ={
                access_token: user.accessToken
            }

            userAuthThroughServer(serverRoute,formData)
        })
        .catch(err=>{
            toast.error('trouble login through google');
            return console.log(err)
        })
    }
    return (
        access_token ? <Navigate to="/" />:
        <AnimationWrapper keyValue={type}> 
        <section className="h-cover flex items-center justify-center ">
            <Toaster/>
            <form id="formElement" className="w-[80%] max-w-[400px]">
                <h1 className="text-4xl font-gelasio capitalize text-center mb-24">
                    {type == "sign-in" ? "Welcome back" : "Join us today"}

                </h1>
                {
                    type != "sign-in" ?
                    <InputBox   name="fullname"
                                type="text"
                                placeholder="full name"
                                icon="fi-rr-user" 
                    />
                    :""
                }
                <InputBox       name="email"
                                type="email"
                                placeholder="Email"
                                icon="fi-rr-at" 
                />
                <InputBox       name="password"
                                type="password"
                                placeholder="Password"
                                icon="fi-rr-key" 
                />
                <button
                    className="btn-dark center mt-10" 
                    type="submit"
                    onClick={handleSubmit}
                    >
                        {type.replace("-"," ")}
                
                </button>

                <div className="relative w-full flex items-centre gap-2 my-10 opacity-10 uppercase text-black font-bold">
                    <hr className="w-1/2 border-black"></hr>
                    <p>or</p>
                    <hr className="w-1/2 border-black"></hr>
                </div>

                <button className="btn-dark flex items-center justify-center gap-4 w-[90%] center"
                onClick={handleGoogleAuth}>
                    <img src={googleicon} className="w-5"/>Continue with google
                </button>

                {
                    type == "sign-in" ?
                    <p className="mt-6 text-dark-grey text-xl text-center">
                        Don't have an account?
                        <Link to="/signup" className="underline text-black text-xl ml-1">
                            join us today
                        </Link>
                    </p>
                    :
                    <p className="mt-6 text-dark-grey text-xl text-center">
                        Already a member?
                        <Link to="/signin" className="underline text-black text-xl ml-1">
                            Sign in here.
                        </Link>
                    </p>
                    
                }



                </form>
        </section>
        </AnimationWrapper>
    )
}

export default UserAuthForm;