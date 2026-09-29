const registerAuthValidator = ({ username, email, password }) => {
    const errors = [];

    if(!username || typeof username !== "string" || username.trim().length < 3) {
        errors.push("Username is required and must be at least 3 characters long");
    }

    if(!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
        errors.push("A valid email is required");
    }

    if(!password || typeof password !== "string" || password.length < 6) {
        errors.push("Password is required and must be at least 6 characters long");
    }


    return errors;
}

export { registerAuthValidator };