const functions = require("firebase-functions");
const app = require("express")();

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

exports.api = functions.region("europe-west1").https.onRequest(app);
