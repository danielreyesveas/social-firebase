const { admin, db } = require("../utils/admin");
const config = require("../utils/config");
const firebase = require("firebase");
const {
    signUpValidation,
    loginValidation,
    reduceUserDetails,
} = require("../utils/validators");
const { response } = require("express");
const storageUrl = "https://firebasestorage.googleapis.com/v0/b";

firebase.initializeApp(config);

// Sign Up

exports.signUp = (request, response) => {
    let token, userId;
    const noImg = "no-img.png";

    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle,
    };

    const { isValid, errors } = signUpValidation(newUser);

    if (!isValid) {
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
                imageUrl: `${storageUrl}/${config.storageBucket}/o/${noImg}?alt=media`,
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
                return response.status(500).json({
                    general: "Something went wrong, please try again.",
                });
            }
        });
};

// Login

exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password,
    };

    const { isValid, errors } = loginValidation(user);

    if (!isValid) {
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
            if (
                error.code === "auth/wrong-password" ||
                error.code === "auth/user-not-found"
            ) {
                return response
                    .status(403)
                    .json({ general: "Wrong credentials, please try again." });
            } else {
                return response.status(500).json({ error: error.code });
            }
        });
};

// Add user details

exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body);

    db.doc(`/users/${request.user.handle}`)
        .update(userDetails)
        .then(() => {
            return response.json({ message: "Details added successfully." });
        })
        .catch((error) => {
            console.error(error);
            return response.status(500).json({ error: error.code });
        });
};

exports.getUserDetails = (request, response) => {
    let userData = {};
    db.doc(`/users/${request.params.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                userData.user = doc.data();

                return db
                    .collection("screams")
                    .where("userHandle", "==", request.params.handle)
                    .orderBy("createdAt", "desc")
                    .get();
            } else {
                return response.status(404).json({ error: "User not found." });
            }
        })
        .then((data) => {
            userData.screams = [];
            data.forEach((doc) => {
                userData.screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    createdAt: doc.data().createdAt,
                });
            });
            return response.json(userData);
        })
        .catch((error) => {
            console.error(error);
            return response.status(400).json({ error: error.code });
        });
};

exports.markNotificationsRead = (request, response) => {
    let batch = db.batch();

    request.body.forEach((notificationId) => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, { read: true });
    });

    batch
        .commit()
        .then(() => {
            return response.json({ message: "Notifications marked read." });
        })
        .catch((error) => {
            console.error(error);
            return response.status(500).json({ error: error.code });
        });
};

// Get current user details

exports.getAuthenticatedUser = (request, response) => {
    let userData = {};

    db.doc(`/users/${request.user.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db
                    .collection("likes")
                    .where("userHandle", "==", request.user.handle)
                    .get();
            }
        })
        .then((data) => {
            userData.likes = [];
            data.forEach((doc) => {
                userData.likes.push(doc.data());
            });
            return db
                .collection("notifications")
                .where("recipient", "==", request.user.handle)
                .orderBy("createdAt", "desc")
                .limit(10)
                .get();
        })
        .then((data) => {
            userData.notifications = [];
            data.forEach((doc) => {
                userData.notifications.push({
                    notificationId: doc.id,
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    screamId: doc.data().screamId,
                    type: doc.data().type,
                    read: doc.data().read,
                    createdAt: doc.data().createdAt,
                });
            });
            return response.json(userData);
        })
        .catch((error) => {
            console.error(error);
            return response.status(500).json({ error: error.code });
        });
};

// Upload a profile image

exports.uploadImage = (request, response) => {
    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    const busboy = new BusBoy({ headers: request.headers });
    let imageFilename;
    let imageToBeUploaded = {};

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
            return response
                .status(400)
                .json({ error: "Wrong file type submitted." });
        }
        // Create file object
        const imageExtension = filename.split(".")[
            filename.split(".").length - 1
        ];
        imageFilename = `${Math.round(
            Math.random() * 100000000000
        )}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFilename);
        imageToBeUploaded = { filepath, mimetype };

        file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on("finish", () => {
        admin
            .storage()
            .bucket()
            .upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype,
                    },
                },
            })
            .then(() => {
                const imageUrl = `${storageUrl}/${config.storageBucket}/o/${imageFilename}?alt=media`;
                return db
                    .doc(`/users/${request.user.handle}`)
                    .update({ imageUrl });
            })
            .then(() => {
                return response.json({
                    message: "Image uploaded successfully.",
                });
            })
            .catch((error) => {
                console.error(error);
                return response.status(500).json({ error: error.code });
            });
    });

    busboy.end(request.rawBody);
};
