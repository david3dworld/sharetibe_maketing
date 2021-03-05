import { createTransitConverters } from './serializer.js';

// We'll use the SDK provided one when the typeHandler for BigDecimal is fixed.
// Needs to writer: v => v.value.toString(), not writer: v => v.value
export const write = (data, opts = {}) => {
    const { typeHandlers = [], verbose = false } = opts;
    const converters = createTransitConverters(typeHandlers, { verbose });
    return converters.writer.write(data);
  };

function serialize(data) {
    return write(data, { verbose: false })
};
  
function deserialize(str) {
    return transit.read( str, { typeHandlers } );
};

function sendTransit(req, res, ret) {
    if(req.headers['accept'] == 'application/transit+json') {
        try {
            res.status(200)
                .set('Content-Type', 'application/transit+json')
                .send(serialize(ret));
        }
        catch(e) {
            res.status(500)
                .json({ error: e })
                .end();
        }
    }
    else {
        res.status(200)
            .json(ret)
            .end();
    }
};

export { sendTransit }
