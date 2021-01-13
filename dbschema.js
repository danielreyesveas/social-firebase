let db = {
    comments: [
        {
            userHandle: "user1",
            screamId: "S6S4gNpR46a4",
            body: "Cool...",
            createdAt: "2021-01-13T10:47:08.753Z",
        },
    ],
    notifications: [
        {
            recipient: "user",
            sender: "user2",
            screamId: "S6S4gNpR46a4",
            read: "true | false",
            type: "like | comment",
            createdAt: "2020-01-12T12:00:00:001Z",
        },
    ],
    screams: [
        {
            userHandle: "user",
            body: "This is the scream body",
            createdAt: "2020-01-12T12:00:00:001Z",
            likeCount: 5,
            commentCount: 2,
        },
    ],
    users: [
        {
            userId: "c1CJt1G7PBS6S4gNpR46a4G3Ls83",
            email: "user@email.com",
            handle: "user",
            createdAt: "2021-01-13T10:47:08.753Z",
            imageUrl:
                "https://firebasestorage.googleapis.com/v0/b/social-reciclatusanimales.appspot.com/o/26156779246.jpg?alt=media",
            bio: "Hello, I'm User.",
            website: "https://reciclatusanimales.com",
            location: "Málaga, ES",
        },
    ],
};

const userDetails = {
    // Redux data
    credentials: {
        userId: "c1CJt1G7PBS6S4gNpR46a4G3Ls83",
        email: "user@email.com",
        handle: "user",
        createdAt: "2021-01-13T10:47:08.753Z",
        imageUrl:
            "https://firebasestorage.googleapis.com/v0/b/social-reciclatusanimales.appspot.com/o/26156779246.jpg?alt=media",
        bio: "Hello, I'm User.",
        website: "https://reciclatusanimales.com",
        location: "Málaga, ES",
    },
    likes: [
        {
            userHandle: "user1",
            screamId: "S6S4gNpR46a4",
        },
        {
            userHandle: "user2",
            screamId: "t1G7P56s",
        },
    ],
};
