import Joi from "joi";

/**
 * Middleware để validate request body với Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.validate(req.body, { 
            abortEarly: false,
            stripUnknown: true 
        });
        
        if (result.error) {
            const errors = result.error.details.map(d => d.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }
        
        // Gán validated data vào req.body
        req.body = result.value;
        next();
    };
};

/**
 * Middleware để validate query params
 */
export const validateQuery = (schema) => {
    return (req, res, next) => {
        const result = schema.validate(req.query, { 
            abortEarly: false,
            stripUnknown: true 
        });
        
        if (result.error) {
            const errors = result.error.details.map(d => d.message);
            return res.status(400).json({
                success: false,
                message: "Query validation failed",
                errors
            });
        }
        
        req.query = result.value;
        next();
    };
};

/**
 * Middleware để validate params
 */
export const validateParams = (schema) => {
    return (req, res, next) => {
        const result = schema.validate(req.params, { 
            abortEarly: false 
        });
        
        if (result.error) {
            const errors = result.error.details.map(d => d.message);
            return res.status(400).json({
                success: false,
                message: "Params validation failed",
                errors
            });
        }
        
        req.params = result.value;
        next();
    };
};
