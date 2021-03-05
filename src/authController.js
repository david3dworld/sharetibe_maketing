import crypto from 'crypto';
import oauth2orize from 'oauth2orize';
import passport from 'passport';
import bearer from 'passport-http-bearer';

import { RefreshToken, AccessToken } from './authModel.js';
import { User } from './userModel.js';
import { uid } from './util.js';
import { sendTransit } from './sdk.js';

const refreshTimeout = (12 * 60 * 60);

passport.use(new bearer.Strategy((accessToken, done) => {
    var tokenHash = crypto.createHash('sha1').update(accessToken).digest('hex');

    AccessToken.findOne({ tokenHash: tokenHash }).then(token  => {
        if (!token) { return done(null, false); }

        if (Math.round((Date.now() - token.createdAt) / 1000) > refreshTimeout) {
            // Note we do NOT remove the access token as this can cause a race-condition in the refresh
            return done(null, false,  { scope: token.scope } );
        } else {
            done(null, (token.userId===undefined)?token.clientId:token.userId, { scope: token.scope });
        }
    });
}));

// Create OAuth 2.0 server
var authController = oauth2orize.createServer();

// Exchange username & password for access token
authController.exchange(oauth2orize.exchange.password({ userProperty: 'body' }, function (client, username, password, scope, done) {
    User.findOne({ 'attributes.email': username, 'attributes.banned': false, 'attributes.deleted': false }).then(user => {
        if (!user || !user.checkPassword(username, password)) { return done(null, false); }

        // Delete any existing access or refresh tokens
        RefreshToken.deleteMany({ userId: user.id.uuid }).then(result => {
            AccessToken.deleteMany({ userId: user.id.uuid }).then(result => {
                var s = (Array.isArray(scope)) ? scope[0] : scope;                       
                
                // Make sure it's not null
                s = s !== null? s : 'user';

                // Create access token
                var token = uid(256)
                var accessToken = new AccessToken;
                accessToken.userId = user.id.uuid;
                accessToken.scope = s;
                accessToken.clientId = client.client_id;
                accessToken.tokenHash = crypto.createHash('sha1').update(token).digest('hex');
                accessToken.save().then((at, err) => {
                    if (err) return done(err);
            
                    // Create refresh token
                    var refreshToken = new RefreshToken;
                    refreshToken.userId = user.id.uuid;
                    refreshToken.clientId = client.client_id;
                    refreshToken.scope = s;
                    refreshToken.token = crypto.randomBytes(32).toString('hex');
                    refreshToken.save().then((rt, err) => {
                        if (err) return done(err);

                        // scope must not be an array despite being passed as one, else FTW crashes
                        done(null, token, refreshToken.token, { expires_in: refreshTimeout, scope: s });
                    });
                });
            });
        });
    });
}));

// Exchange clientCredentials for access token
authController.exchange(oauth2orize.exchange.clientCredentials({ userProperty: 'body' }, function (client, scope, done) {
    var tokenVal = uid(256)

    // HACK to mirror Sharetribe server
    if(scope === undefined && client.client_secret !== undefined) {
        scope[0] = 'integ';
    }

    // TODO: for integration APIs client_id/client_secret should be validated
    // before handing over an AuthToken with 'integ' scope

    var accessToken = new AccessToken;
    accessToken.clientId = client.client_id;
    accessToken.scope = (Array.isArray(scope)) ? scope[0] : scope;
    accessToken.tokenHash = crypto.createHash('sha1').update(tokenVal).digest('hex');
    accessToken.save().then((at, err) => {
        if (err) return done(err);

        var refreshToken = new RefreshToken;
        refreshToken.token = crypto.randomBytes(32).toString('hex');
        refreshToken.clientId = client.client_id;
        refreshToken.scope = (Array.isArray(scope)) ? scope[0] : scope;
        refreshToken.save().then((rt, err) => {
            if (err) return done(err);

            return done(null, tokenVal, rt.token, { expires_in: refreshTimeout, scope: scope[0] })
        });
    });
}));

// Exchange refreshToken for access token
authController.exchange(oauth2orize.exchange.refreshToken({ userProperty: 'body' }, function (client, refreshToken, scope, done) {
    RefreshToken.findOne({ token: refreshToken }).then(token => {
        if (!token) { return done(null, false); }
        
        // Create access token. We don't delete the old one in case a new request comes in before we 
        // create the new one (causeing an effective log-out)
        var tokenVal = uid(256)
        var accessToken = new AccessToken;
        accessToken.userId = token.userId;
        accessToken.scope = token.scope;
        accessToken.clientId = client.client_id;
        accessToken.tokenHash = crypto.createHash('sha1').update(tokenVal).digest('hex');
        accessToken.save().then((at, err) => {
            if (err) return done(err);

            done(null, tokenVal, refreshToken, { expires_in: refreshTimeout, scope: token.scope });
        });
    });
}));

// FTW 6.0 priviledged transition requirement (no check of clientID/secret, only user token)
authController.exchange('token_exchange', function(req, res, done)  {
    var tokenHash = crypto.createHash('sha1').update(req.body.subject_token).digest('hex');

    // TODO: for priviledged transistions the clientID/secret should be evaluated
    AccessToken.findOne({ tokenHash: tokenHash }).then(token  => {
        if (!token) { 
            return done(null, false); 
        }
        else {
            RefreshToken.findOne({ userId: token.userId }).then(refreshToken => {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-store');
                res.setHeader('Pragma', 'no-cache');
                res.end(JSON.stringify({
                    access_token: req.body.subject_token, // User authToken 
                    refresh_token: refreshToken.token, // Refresh token for THIS authToken (TODO: if refreshed, scope wouldn't be trusted:user!!!!)
                    expires_in: refreshTimeout,
                    scope: 'trusted:user',
                    token_type: 'bearer',
                }))
            })    
        }
    });
});

// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens. Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request. Clients must
// authenticate when making requests to this endpoint.

var token = [
    authController.token(),
    authController.errorHandler()
];

function revoke(req, res) {
    RefreshToken.findOne({ token: req.body.token }).then(token => {
        AccessToken.deleteMany({ userId: token.userId }).then(result => {
            RefreshToken.deleteMany({ userId: token.userId }).then(result => {
                sendTransit(req, res, { revoked: true });
            });
        })
    })
}

function get(req, res) {
    var i = 22; //TODO
} 

export default { token, revoke, get };