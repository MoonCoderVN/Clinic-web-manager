const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
    let message = err.message;

    // Mongoose CastError - invalid ObjectId
    if (err.name === "CastError" && err.kind === "ObjectId") {
        statusCode = 404;
        message = "Resource not found";
    }
    // Mongoose ValidationError - field validation errors
    else if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors).map(v => v.message).join(", ");
    }
    // Mongoose DuplicateKeyError - unique constraint violation
    else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyPattern || {})[0] || "field";
        message = `Giá trị đã tồn tại cho trường ${field}`;
    }
    // Mongoose ValidatorError - custom validator errors
    else if (err.name === "ValidatorError") {
        statusCode = 400;
        message = err.message;
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};

export { notFound, errorHandler };
