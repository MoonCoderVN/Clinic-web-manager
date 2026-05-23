export const paginate = async (model, query = {}, options = {}) => {
    const page  = Math.max(1, parseInt(options.page)  || 1);
    const limit = Math.min(100, parseInt(options.limit) || 20);
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
        model.find(query).skip(skip).limit(limit).sort(options.sort || { createdAt: -1 }),
        model.countDocuments(query),
    ]);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
        },
    };
};
