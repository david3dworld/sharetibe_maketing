const { UUID } = require('sharetribe-flex-sdk').types;
const mongoose = require('mongoose');

var imageSchema = mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'image' },
    attributes: {
        variants: {
            'square-small': { type: mongoose.Mixed },
            'square-small2x': { type: mongoose.Mixed },
            'default': { type: mongoose.Mixed },
            'landscape-crop': { type: mongoose.Mixed },
            'landscape-crop2x': { type: mongoose.Mixed },
            'landscape-crop4x': { type: mongoose.Mixed },
            'landscape-crop6x': { type: mongoose.Mixed },
            'scaled-small': { type: mongoose.Mixed },
            'scaled-medium': { type: mongoose.Mixed },
            'scaled-large': { type: mongoose.Mixed },
            'scaled-xlarge': { type: mongoose.Mixed },
        }
    }
}, { id: false });

// Connect to Mongoose and set connection variable
//mongoose.connect('mongodb://mongoadmin:Winchester2020@185.43.51.91/ffs?authSource=admin', { 
mongoose.connect('mongodb://localhost/ffs', { 
     useNewUrlParser: true, 
     useUnifiedTopology: true 
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
     console.log("Db connected successfully")
});

const Image = mongoose.model('image', imageSchema);

async function convall() {
    Image.find({}).then(function(images) {
        for(var i = 0; i < images.length; i++) {
            var x = images[i].attributes.variants;
            var re = /\:5000/i;

            if(x['square-small'] != undefined &&
                x['square-small'].url.slice(0,17) == 'https://localhost') {
                var updates = {};

                console.log(images[i].id.uuid);
                
                if(x['square-small'].url != undefined) {
                    var n = x['square-small'].url.search(re);

                    updates['attributes.variants.square-small.url'] = 'http://localhost' + x['square-small'].url.slice(n,) 
                }
                if(x['square-small2x'].url != undefined) {
                    var n = x['square-small2x'].url.search(re);

                    updates['attributes.variants.square-small2x.url'] = 'http://localhost' + x['square-small2x'].url.slice(n,) 
                }
                if(x['default'].url != undefined) {
                    var n = x['default'].url.search(re);
                    
                    updates['attributes.variants.default.url'] = 'http://localhost' + x['default'].url.slice(n,) 
                }
                if(x['scaled-small'].url != undefined) {
                    var n = x['scaled-small'].url.search(re);

                    updates['attributes.variants.scaled-small.url'] = 'http://localhost' + x['scaled-small'].url.slice(n,) 
                }
                if(x['scaled-medium'].url != undefined) {
                    var n = x['scaled-medium'].url.search(re);
                    updates['attributes.variants.scaled-medium.url'] = 'http://localhost' + x['scaled-medium'].url.slice(n,) 
                }
                if(x['scaled-large'].url != undefined) {
                    var n = x['scaled-large'].url.search(re);
                    updates['attributes.variants.scaled-large.url'] = 'http://localhost' + x['scaled-large'].url.slice(n,) 
                }
                if(x['scaled-xlarge'].url != undefined) {
                    var n = x['scaled-xlarge'].url.search(re);
                    updates['attributes.variants.scaled-xlarge.url'] = 'http://localhost' + x['scaled-xlarge'].url.slice(n,) 
                }
                if(x['landscape-crop'].url != undefined) {
                    var n = x['landscape-crop'].url.search(re);
                    updates['attributes.variants.landscape-crop.url'] = 'http://localhost' + x['landscape-crop'].url.slice(n,) 
                }
                if(x['landscape-crop2x'].url != undefined) {
                    var n = x['landscape-crop2x'].url.search(re);
                    updates['attributes.variants.landscape-crop2x.url'] = 'http://localhost' + x['landscape-crop2x'].url.slice(n,) 
                }
                if(x['landscape-crop4x'].url != undefined) {
                    var n = x['landscape-crop4x'].url.search(re);
                    updates['attributes.variants.landscape-crop4x.url'] = 'http://localhost' + x['landscape-crop4x'].url.slice(n,) 
                }
                if(x['landscape-crop6x'].url != undefined) {
                    var n = x['landscape-crop6x'].url.search(re);
                    updates['attributes.variants.landscape-crop6x.url'] = 'http://localhost' + x['landscape-crop6x'].url.slice(n,) 
                }
                
                Image.updateOne({'id.uuid': images[i].id.uuid }, { $set: updates }).then(result => {
                    console.log('update: ', images[i].id.uuid, result );
                })
                
            }
            else {
                console.log('already converted: ', images[i].id.uuid);
            }
        }
    });
}

convall();