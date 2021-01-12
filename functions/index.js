const functions = require("firebase-functions");
const admin = require("firebase-admin");
const app = require("express")();

admin.initializeApp();

const config = {
    apiKey: "AIzaSyCW6moi8C1rOOPgSlyhcPGbUXTMel5ZR3g",
    authDomain: "social-reciclatusanimales.firebaseapp.com",
    databaseURL:
        "https://social-reciclatusanimales-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "social-reciclatusanimales",
    storageBucket: "social-reciclatusanimales.appspot.com",
    messagingSenderId: "51547901240",
    appId: "1:51547901240:web:1e82a8bef3bd0d343bc5cd",
};

const firebase = require("firebase");
firebase.initializeApp(config);

const db = admin.firestore();

app.get("/screams", (request, response) => {
    db.collection("screams")
        .orderBy("createdAt", "desc")
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                });
            });
            return response.json(screams);
        })
        .catch((error) => console.error(error));
});

app.post("/scream", (request, response) => {
    const newScream = {
        userHandle: request.body.userHandle,
        body: request.body.body,
        createdAt: new Date().toISOString(),
    };

    db.collection("screams")
        .add(newScream)
        .then((doc) => {
            response.json({
                message: `Document ${doc.id} created successfully.`,
            });
        })
        .catch((error) => {
            response.status(500).json({ error: "Something went wrong." });
            console.error(error);
        });
});

const isEmpty = (string) => {
    return string.trim() === "";
};

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return email.match(regEx);
};

// Signup route

app.post("/signup", (request, response) => {
    let errors = {};
    let token, userId;

    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle,
    };

    if (isEmpty(newUser.email)) {
        errors.email = "Must not be empty.";
    } else if (!isEmail(newUser.email)) {
        errors.email = "Must provide a valid email address.";
    }

    if (isEmpty(newUser.password)) {
        errors.password = "Must not be empty.";
    }

    if (newUser.password !== newUser.confirmPassword) {
        errors.confirmPassword = "Passwords must match.";
    }

    if (isEmpty(newUser.handle)) {
        errors.handle = "Must not be empty.";
    }

    if (Object.keys(errors).length > 0) {
        return response.status(400).json(errors);
    }

    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return response
                    .status(400)
                    .json({ handle: "This handle is already taken." });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(
                        newUser.email,
                        newUser.password
                    );
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((userToken) => {
            token = userToken;
            const userCredentials = {
                userId,
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return response.status(201).json({ token });
        })
        .catch((error) => {
            console.error(error);
            if (error.code === "auth/email-already-in-use") {
                return response
                    .status(400)
                    .json({ email: "Email is already registered." });
            } else {
                return response.status(500).json({ error: error.code });
            }
        });
});

app.post("/login", (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password,
    };

    let errors = {};

    if (isEmpty(user.email)) {
        errors.email = "Must not be empty.";
    }
    if (isEmpty(user.password)) {
        errors.password = "Must not be empty.";
    }

    if (Object.keys(errors).length > 0) {
        return response.status(400).json(errors);
    }

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return response.json({ token });
        })
        .catch((error) => {
            console.error(error);
            if (error.code === "auth/wrong-password") {
                return response
                    .status(403)
                    .json({ general: "Wrong credentials, please try again." });
            } else {
                return response.status(500).json({ error: error.code });
            }
        });
});

exports.api = functions.region("europe-west1").https.onRequest(app);
