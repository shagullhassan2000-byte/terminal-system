// Input validation middleware

function clean(val) {
    if (val === null || val === undefined) return '';
    return String(val).trim().replace(/<[^>]*>/g, '').substring(0, 500);
}

function isPositiveNum(val) {
    const n = parseFloat(val);
    return !isNaN(n) && n >= 0 && isFinite(n);
}

function validateTrip(req, res, next) {
    const { type, driver_name, route_from, route_to, fare_per_person } = req.body;
    const errors = [];
    if (!type || !['City Taxi', 'Short Distance', 'Bus'].includes(type))
        errors.push('جۆری گەشت هەڵەیە');
    if (!driver_name || clean(driver_name).length < 2)
        errors.push('ناوی شۆفێر پێویستە');
    if (!route_from || clean(route_from).length < 1)
        errors.push('شوێنی دەرچوون پێویستە');
    if (!route_to || clean(route_to).length < 1)
        errors.push('شوێنی مەبەست پێویستە');
    if (fare_per_person !== undefined && !isPositiveNum(fare_per_person))
        errors.push('نرخ دەبێت ژمارەی ئەرێنی بێت');
    if (errors.length > 0)
        return res.status(400).json({ success: false, error: errors.join(' | ') });
    req.body.driver_name     = clean(driver_name);
    req.body.route_from      = clean(route_from);
    req.body.route_to        = clean(route_to);
    req.body.driver_phone    = clean(req.body.driver_phone || '');
    req.body.driver_car      = clean(req.body.driver_car || '');
    req.body.notes           = clean(req.body.notes || '');
    req.body.fare_per_person = parseFloat(fare_per_person) || 0;
    next();
}

function validateDriver(req, res, next) {
    const { name, phone, car_number, car_type } = req.body;
    const errors = [];
    if (!name || clean(name).length < 2) errors.push('ناوی شۆفێر پێویستە');
    if (!phone || !/^07[0-9]{9}$/.test(phone.replace(/\s/g, '')))
        errors.push('ژمارەی مۆبایل دەبێت بە 07 دەست پێبکات (١١ ژمارە)');
    if (!car_number || clean(car_number).length < 2) errors.push('ژمارەی ئۆتۆمبێل پێویستە');
    if (errors.length > 0)
        return res.status(400).json({ success: false, error: errors.join(' | ') });
    req.body.name       = clean(name);
    req.body.phone      = phone.replace(/\s/g, '');
    req.body.car_number = clean(car_number);
    req.body.car_type   = car_type || 'Taxi';
    next();
}

function validatePassenger(req, res, next) {
    const { trip_id, name } = req.body;
    const errors = [];
    if (!trip_id || isNaN(parseInt(trip_id))) errors.push('ژمارەی ڕۆیشتن پێویستە');
    if (!name || clean(name).length < 2) errors.push('ناوی گەشتیار پێویستە');
    if (errors.length > 0)
        return res.status(400).json({ success: false, error: errors.join(' | ') });
    req.body.trip_id     = parseInt(trip_id);
    req.body.name        = clean(name);
    req.body.passport    = clean(req.body.passport || '');
    req.body.nationality = clean(req.body.nationality || '');
    next();
}

function validateLogin(req, res, next) {
    const { username, password } = req.body;
    if (!username || username.trim().length < 2)
        return res.status(400).json({ success: false, error: 'ناوی بەکارهێنەر پێویستە' });
    if (!password || password.length < 4)
        return res.status(400).json({ success: false, error: 'وشەی نهێنی کەمتر نەبێ لە ٤ پیت   پێویستە' });
    req.body.username = username.trim().toLowerCase();
    next();
}

module.exports = { validateTrip, validateDriver, validatePassenger, validateLogin };
