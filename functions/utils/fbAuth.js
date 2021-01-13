const { admin, db } = require("./admin");

module.exports = (request, response, next) => {
    let idToken;
    const authorization = request.headers.authorization;
    if (authorization && authorization.startsWith("Bearer ")) {
        idToken = authorization.split("Bearer ")[1];
    } else {
        console.error("Token not found.");

        return response.status(403).json({ error: "Unauthorized." });
    }

    admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
            request.user = decodedToken;

            return db
                .collection("users")
                .where("userId", "==", request.user.uid)
                .limit(1)
                .get();
        })
        .then((data) => {
            request.user.handle = data.docs[0].data().handle;
            request.user.imageUrl = data.docs[0].data().imageUrl;
            // Allow request to proceed
            return next();
        })
        .catch((error) => {
            console.error("Error while verifying token", error);

            return response.status(403).json(error);
        });
};
