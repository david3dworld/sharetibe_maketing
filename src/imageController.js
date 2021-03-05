import axios from 'axios'
import FormData from 'form-data';
import sharp from 'sharp';

import { Image } from './imageModel.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';

async function rotate(data) {
    return await sharp(data)
        .rotate()
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toBuffer(function (err, outputBuffer, info) {
            var x = 22;
            // outputBuffer contains image data,
            // auto-rotated using EXIF Orientation tag
            // info.width and info.height contain the dimensions of the resized image
        });
}

function getImageProjection(query)
{
    var projection = {};

    if(query['fields.image'] != undefined) {
        var fields = query['fields.image'].split(',');

        for(const field of fields) {
            projection['attributes.' + field] = 1
        }
    }

    return projection;
}

export async function getImage(query, id) {
    const projection = getImageProjection(query);

    // If any projection has been specified, FTW also wants id and type
    if (Object.keys(projection).length != 0) {
        projection['id'] = 1;
        projection['type'] = 1;
    }

    return await Image.findOne( { 'id.uuid': id }, projection).lean();
}

// Handle upload endpoint
function upload(req, res) {
    try {
        const file = req.files.image;

        rotate(file.data).then(buffer => {
            const imageURL = process.env.IMAGE_SERVER;
            let form = new FormData;

            form.append('file', buffer, { filename: file.name } );
            axios.post(imageURL, form, { headers: form.getHeaders() }).then(result => {
                var image = new Image;

                image.attributes.variants['default'] = {
                    width: 750,
                    height: 562,
                    name: 'default',
                    url: imageURL + result.data.filename + '?auto=format&fit=clip&h=750&ixlib=java-1.1.1&w=750&s=a3df1f206e6e5dd81666baf444f9de34'
                };
                image.attributes.variants['square-small'] = {
                    width: 240,
                    height: 240,
                    name: 'square-small',
                    url: imageURL + result.data.filename + '?auto=format&crop=edges&fit=crop&h=240&ixlib=java-1.1.1&w=240&s=629e8be0a79649d820763abbf515bdde'
                };
                image.attributes.variants['square-small2x'] = {
                    width: 480,
                    height: 480,
                    name: 'square-small2x',
                    url: imageURL + result.data.filename + '?auto=format&crop=edges&fit=crop&h=480&ixlib=java-1.1.1&w=480&s=c713c6d515b484167eda66b3328b1cf2'
                };
                image.attributes.variants['scaled-small'] = {
                    width: 320,
                    height: 240,
                    name: 'scaled-small',
                    url: imageURL + result.data.filename + '?auto=format&fit=clip&h=320&ixlib=java-1.1.1&w=320&s=83ffbe9bdf3ffc925efaf11aa122d152'
                };
                image.attributes.variants['square-small2x'] = {
                    width: 480,
                    height: 480,
                    name: 'square-small2x',
                    url: imageURL + result.data.filename + '?auto=format&crop=edges&fit=crop&h=480&ixlib=java-1.1.1&w=480&s=c713c6d515b484167eda66b3328b1cf2'
                };
                image.attributes.variants['scaled-medium'] = {
                    width: 750,
                    height: 562,
                    name: 'scaled-medium',
                    url: imageURL + result.data.filename + '?auto=format&fit=clip&h=750&ixlib=java-1.1.1&w=750&s=a3df1f206e6e5dd81666baf444f9de34'
                };
                image.attributes.variants['scaled-large'] = {
                    width: 1024,
                    height: 768,
                    name: 'scaled-large',
                    url: imageURL + result.data.filename + '?auto=format&fit=clip&h=1024&ixlib=java-1.1.1&w=1024&s=64b1e62e5851517f2c7e1634866b3a7c'
                };
                image.attributes.variants['scaled-xlarge'] = {
                    width: 2400,
                    height: 1800,
                    name: 'scaled-xlarge',
                    url: imageURL + result.data.filename + '?auto=format&fit=clip&h=2400&ixlib=java-1.1.1&w=2400&s=707f91ab70cd80206b13dbcbcb7d4ac4'
                };
                image.attributes.variants['landscape-crop'] = {
                    width: 400,
                    height: 267,
                    name: 'landscape-crop',
                    url: imageURL + result.data.filename + '?auto=format&crop=edges&fit=crop&h=267&ixlib=java-1.1.1&w=400&s=980f37f88c90e351f45a943135ad7329'
                };
                image.attributes.variants['landscape-crop2x'] = {
                    width: 800,
                    height: 533,
                    name: 'landscape-crop2x',
                    url: imageURL + result.data.filename + '?auto=format&crop=edges&fit=crop&h=533&ixlib=java-1.1.1&w=800&s=461c873f1509c292a1fad416a94be997'
                };
                image.attributes.variants['landscape-crop4x'] = {
                    width: 1600,
                    height: 1066,
                    name: 'landscape-crop4x',
                    url: imageURL + result.data.filename + '?auto=format&crop=edges&fit=crop&h=1066&ixlib=java-1.1.1&w=1600&s=0e54fb97bc4d92fde104e1f280e1050f'
                };
                image.attributes.variants['landscape-crop6x'] = {
                    width: 2400,
                    height: 1600,
                    name: 'landscape-crop6x',
                    url: imageURL + result.data.filename + '?auto=format&crop=edges&fit=crop&h=1602&ixlib=java-1.1.1&w=2400&s=1b471421f9a52be33537c84c5e0be2d4'
                };
        
                image.id.uuid = generateGuid();
        
                image.save().then(result2 => {
                    console.log('profile updated: (', file.name, ')', result2);
        
                    sendTransit(req, res, { data: image.toObject() });
                })
            }).catch(err => {
                return res.status(500).send(err); 
            });
        })
    } catch(err) {
        return res.status(500).send(err);
    }
}

export default { upload };