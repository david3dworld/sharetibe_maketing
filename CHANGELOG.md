# Change Log

- Major version change (v**X**.0.0): Implementation of additional APIs, new functionality 
- Minor version change (v0.**X**.0): New functionality of existing APIs
- Patch (v0.0.**X**): Bug fixes and small changes

---

## Upcoming version 2020-XX-XX

## [v2.0.0] 2020-06-XX

Add support for FTW 6.0 (exchange_token, privilidged transistions)

## [v1.3.0] 

Added last Integration API for listings

## [v1.2.0] 

Added Integration API update endpoints
Fixed user deleted/banned handling
Changed 'year' handling for new search 
Added new user and listing email notifications 
Added Integration API authentication (rev.1 - scope 'integ' clientId auth)

## [v1.1.0] 

Added Integration APIs to support FFS Admin

## [v1.0.0] 2020-05-19

Added provider funds transfer on transaction complete and password reset. This is now API complete!

## [v0.9.0]

Added SSL and re-arranged project in a more typical layout for Heroku

## [v0.8.0]

Implemented OAuth2 handling via passport and oauth2orize (easy to add new authenticators now)

## [v0.7.0]

Add payment method and pay out handling for Stripe

## [v0.6.0]

Added notifications via SendGrid (as per Sharetribe). Template management is done via SendGrid's UI

## [v0.5.0]

Added reviews and finished transition controller (transaction state machine)

## [v0.4.0]

Added transaction framework and messages, stripe payments, and booking models

## [v0.3.0]

Added ownListing and Image handling (creation, editing, upload)

## [v0.2.0]

Added currentUser (creation, editing, authentication)

## [v0.1.0]

Provides basic listing, users, timeslots (non DB provided), and reviews (no DB provided), APIs. Enough to run the first few read-only screens of FTW

- Starting a change log for FFS
