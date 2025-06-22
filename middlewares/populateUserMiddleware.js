// server/src/middlewares/populateUserMiddleware.js (Temporary for debugging)
const populateUserOptional = async (req, res, next) => {
    //console.log(`--- [PopulateUserMiddleware - DEBUG] START for ${req.method} ${req.path} ---`);
    //console.log('[PopulateUserMiddleware - DEBUG] All Request Headers:', JSON.stringify(req.headers, null, 2));
    
    const authHeader = req.headers.authorization;
    if (authHeader) {
        //console.log('[PopulateUserMiddleware - DEBUG] Authorization header IS PRESENT:', authHeader);
        if (authHeader.startsWith('Bearer ')) {
            //console.log('[PopulateUserMiddleware - DEBUG] Authorization header STARTS WITH Bearer.');
        } else {
            //console.log('[PopulateUserMiddleware - DEBUG] Authorization header DOES NOT START WITH Bearer.');
        }
    } else {
        //console.log('[PopulateUserMiddleware - DEBUG] Authorization header IS MISSING.');
    }
    req.user = undefined; // Keep it simple for this test
    //console.log(`--- [PopulateUserMiddleware - DEBUG] END ---`);
    next();
};

module.exports = { populateUserOptional };