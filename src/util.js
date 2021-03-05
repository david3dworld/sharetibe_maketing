
// General utils
function getPaging(query) {
    var paging = { 'sort': { createdAt: -1 } };

    if(query['page'] != undefined && query['per_page'] != undefined) {
        const page = Number(query['page']);
        const perPage = Number(query['per_page'])

        paging['limit'] = perPage;
        paging['skip'] = ((page - 1) * perPage);
    }

    if(query['sort'] != undefined) {
        var fieldx = query['sort'];
        var order = -1;

        if(fieldx[0] == '-') {
            order = 1;
            fieldx = fieldx.slice(1,);
        }

        if(fieldx == 'createdAt')
            paging['sort'] = { 'attributes.createdAt': order };
        else if(fieldx == 'price')
            paging['sort'] = { 'attributes.price.amount': order };
    }
    else {
        // Default order by creation
        paging['sort'] = { 'attributes.createdAt': -1 }; 
    }

    return paging;
}

function generateGuid() {
    var result, i, j;
    result = '';
    for(j=0; j<32; j++) {
      if( j == 8 || j == 12 || j == 16 || j == 20) 
        result = result + '-';
      i = Math.floor(Math.random()*16).toString(16).toUpperCase();
      result = result + i;
    }
    return result;
}

function uid(len) {
    var buf = []
        , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        , charlen = chars.length;

    for (var i = 0; i < len; ++i) {
        buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export { getPaging, generateGuid, uid, getRandomInt }