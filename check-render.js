const https = require('https');

https.get('https://deepdale-backend.onrender.com/api/content/home', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status:', res.statusCode);
        if (res.statusCode === 200) {
            console.log('Payload keys:', Object.keys(JSON.parse(data).data));
        } else {
            console.log('Error payload:', data);
        }
    });
}).on('error', (err) => {
    console.log('Request Error: ', err.message);
});
