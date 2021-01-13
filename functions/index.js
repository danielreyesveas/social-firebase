const functions = require("firebase-functions");
const app = require("express")();
const { db } = require("./utils/admin");

const {
    getAllScreams,
    postOneScream,
    getScream,
    commentOnScream,
    likeScream,
    unlikeScream,
    deleteScream,
} = require("./handlers/screams");
const {
    signUp,
    login,
    getAuthenticatedUser,
    addUserDetails,
    uploadImage,
    getUserDetails,
    markNotificationsRead,
} = require("./handlers/users");
const fbAuth = require("./utils/fbAuth");

// Screams routes

app.get("/screams", getAllScreams);
app.get("/scream/:screamId", getScream);
app.post("/scream", fbAuth, postOneScream);

app.delete("/scream/:screamId", fbAuth, deleteScream);
app.get("/scream/:screamId/like", fbAuth, likeScream);
app.get("/scream/:screamId/unlike", fbAuth, unlikeScream);
app.post("/scream/:screamId/comment", fbAuth, commentOnScream);

// Users routes

app.post("/signup", signUp);
app.post("/login", login);
app.post("/user/image", fbAuth, uploadImage);
app.post("/user", fbAuth, addUserDetails);
app.get("/user", fbAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", fbAuth, markNotificationsRead);

exports.createNotificationOnLike = functions
    .region("europe-west1")
    .firestore.document("likes/{id}")
    .onCreate((snapshot) => {
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then((doc) => {
                if (
                    doc.exists &&
                    doc.data().userHandle !== snapshot.data().userHandle
                ) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        screamId: doc.id,
                        type: "like",
                        read: false,
                    });
                }
            })
            .catch((error) => {
                console.error(error);
            });
    });

exports.deleteNotificationOnUnlike = functions
    .region("europe-west1")
    .firestore.document("likes/{id}")
    .onDelete((snapshot) => {
        return db
            .doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((error) => {
                console.error(error);
            });
    });

exports.createNotificationOnComment = functions
    .region("europe-west1")
    .firestore.document("comments/{id}")
    .onCreate((snapshot) => {
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then((doc) => {
                if (
                    doc.exists &&
                    doc.data().userHandle !== snapshot.data().userHandle
                ) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        screamId: doc.id,
                        type: "comment",
                        read: false,
                    });
                }
            })
            .catch((error) => {
                console.error(error);
            });
    });

exports.onUserImageChange = functions
    .region("europe-west1")
    .firestore.document("users/{userId}")
    .onUpdate((change) => {
        console.log(change.before.data());
        console.log(change.after.data());
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            const batch = db.batch();
            return db
                .collection("screams")
                .where("userHandle", "==", change.before.data().handle)
                .get()
                .then((data) => {
                    data.forEach((doc) => {
                        const scream = db.doc(`/screams/${doc.id}`);
                        batch.update(scream, {
                            userImage: change.after.data().imageUrl,
                        });
                    });
                    return db
                        .collection("comments")
                        .where("userHandle", "==", change.before.data().handle)
                        .get();
                })
                .then((data) => {
                    data.forEach((doc) => {
                        const comment = db.doc(`/comments/${doc.id}`);
                        batch.update(comment, {
                            userImage: change.after.data().imageUrl,
                        });
                    });
                    return batch.commit();
                })
                .catch((error) => {
                    console.error(error);
                });
        } else {
            return true;
        }
    });

exports.onScreamDelete = functions
    .region("europe-west1")
    .firestore.document("screams/{screamId}")
    .onDelete((snapshot, context) => {
        const screamId = context.params.screamId;
        const batch = db.batch();
        return db
            .collection("comments")
            .where("screamId", "==", screamId)
            .get()
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                });
                return db
                    .collection("likes")
                    .where("screamId", "==", screamId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                });
                return db
                    .collection("notifications")
                    .where("screamId", "==", screamId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                });
                return batch.commit();
            })
            .catch((error) => {
                console.error(error);
            });
    });

exports.api = functions.region("europe-west1").https.onRequest(app);
