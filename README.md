# flex-api
Free Flex Server (FFS)

This is a backend server for Sharetribe's FTW template web-app. It attempts to implement the Flex Service marketplace endpoints (APIs) provided by the Sharetribe subscription service, in as much as they are requred by OUR FTW-dervived application. Specifically, it aims to support our customization of FTW (for OldenCars.com), and will almost certainly not support yours without some modification (custom data, transaction process, mail templates, etc., etc.).

> This implementation is incomplete and does not fully support the functionaility nor semantics
> documented in the Flex marketplace SDK (https://www.sharetribe.com/api-reference/). It only
> supports the SDK requirements of our FTW-dervived application.

This implementation is a node/express/mongodb stack (MVC structured). It does not exclusively use modern (ES8) javascript semantcs, but rather tries to stick to plain programming patterns (syntax) for better readability. As such, it's probably far from efficient.

The implementation uses MongoDB in a very single threaded fashion (for simplicity). It would be trivial to make many queries concurrent, but performance isn't a factor in this implementation.

This implementation is not network efficient. Where projections would normally limit network traffic, we've not bothered to implement them if the FTW application isn't upset by the excess. In fact, FTW bulks at a lot of 'sparse' returns where document content is required even though it isn't requested!

This implementation is single client/marketplace capable; ClientIds mean nothing to it (ignored).

This implemention is not security focused. No effort has been made to ensure application nor network security. Security (oauth2 tokens, etc.) only exists in as much as is required to implement multi-user functionality.

I hope the structure of the server is simple enough that anyone can hack it to their own frontend requirements. Remember, extended data, transaction processes, availability schemes, and everything  'flex'ible in Sharetribe's implemention is hard-coded here for our needs.

## Quick start (no such thing!)

There is a quick and dirty import script (import.js) for taking data out of the paid-for Sharetribe service, and inserting it in the local MongoDB instance. It is hardcoded for our schema, but should be trivial to customize.

There is also an image import/export script (imgconv.js) intended to take images from imgix and store them locally on a local ngix server provided by imgpush (altered). imgpush (altered) is being used to clip, crop, resize, and supply images stored locally after the script has changed all the references in the image collection. Imagerelocate.js can be used to change the image host in the DB.

There is a stripe-import.js script that you can use with data from the Stripe dashboard to attach connect accounts to the user objects in your MongoDB. It's pretty manual (hopefully not too many of your users aleady have connect accounts!). Not payment methods or not being migrated (users will have to add their payment methods again)

You will need:

**** A mongdb instance (db.xxxx.com). I've been using a 4.2 instance in a docker container on my own servers, but an Atlas instance will be easier if you've not publicly facing hardware.

**** An image server (image.xxxx.com). Sharetribe use imgix, a paid for service. You could use this or the imgpush project I've modified to do much the same (required) processsing, but you'll need hardware to run it on, and to install the correct SSL certs. It's another docker container.

**** Somewhere to run this node app (ffs.xxxx.com). I haven't containerized this (yet) as I run it on Heroku (like the FTW template app). You should create your own git clone of ffs to deploy on Heroku, and don't forget the SSL certs if not!

**** A SendGrid (or other SMTP provider) account to handle notifications. This will require you to update DNS records so emails can come from your organization. The notification controller is the only piece of code involved, but it does use SendGrid templates (you'll need to make your own)

In your FTW-based app, you will need to set REACT_APP_SHARETRIBE_SDK_BASE_URL to this flex server (ffs.xxxx.com). The ffs instance will need to be using SSL if you don't want to modify CORS (csp.js)

## Getting started with customization

You need to understand how Flex is architected. Read the FTW customization guides and the Flex SDK documentation to understand what FFS implements. 

Some familarity with node/express/mongodb/javascript apps will be helpful both in modfying FFS and customizing the FTW template (where react/redux familarity also helps).

## ENV

The following environmental variables need to be set (in .env for development/testing):

MONGODB_URI - the URL of the database server (mongodb://user:password@db.x.com/db?authSource=admin)

SENDGRID_API_KEY - your sendgrid key

STRIPE_PRIVATE_KEY - your Stripe private key

IMAGE_SERVER - the URL of the image server (https://images.x.com:5000/)

## Documentation

See the Flex Docs site: https://www.sharetribe.com/docs/ to understand what we're attempting here. Note we do not have a Flex console nor CLI implementation. Backend management is currently limited to the MongoDB shell :-)

## License

This project is licensed under the terms of the MIT license.

