<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // DKLIC AI Legal Intelligence Assistant — answers questions from
    // admin-uploaded documents only (RAG: relevant document text is fed as
    // context, model is instructed never to answer outside it).
    'anthropic' => [
        'api_key' => env('ANTHROPIC_API_KEY'),
    ],

    // Mobile app push notifications (attendance reminders, etc.) — set once the
    // Firebase project exists. `credentials` is the absolute path to the service
    // account JSON downloaded from Firebase Console > Project Settings > Service Accounts.
    'firebase' => [
        'project_id' => env('FIREBASE_PROJECT_ID'),
        // Never committed (see .gitignore) — the service account key downloaded
        // from Firebase Console > Project Settings > Service Accounts. Override
        // via FIREBASE_CREDENTIALS only if it lives somewhere other than the
        // default private storage path.
        'credentials' => env('FIREBASE_CREDENTIALS', storage_path('app/firebase/firebase-service-account.json')),
    ],

];
