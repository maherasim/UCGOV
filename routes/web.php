<?php

use Illuminate\Support\Facades\Route;

Route::view('/privacy-policy', 'privacy-policy');
Route::view('/delete-account', 'delete-account');

Route::view('/{any?}', 'app')->where('any', '^(?!api|privacy-policy|delete-account).*$');
