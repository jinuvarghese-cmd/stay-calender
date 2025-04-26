<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

// Route::get('/', function () {
//     return Inertia::render('Welcome', [
//         'canLogin' => Route::has('login'),
//         'canRegister' => Route::has('register'),
//         'laravelVersion' => Application::VERSION,
//         'phpVersion' => PHP_VERSION,
//     ]);
// });

// Route::get('/booking-calendar', function () {
//     return Inertia::render('BookingCalendar'); // This will load the `BookingCalendar.vue` component
// });

Route::get('/test', function() { return response('OK'); });


Route::get('/', function () {
    return Inertia::render('BookingCalendar');
});

// routes/web.php
Route::get('/test-db', function() {
    try {
        DB::connection()->getPdo();
        return "DB Connected!";
    } catch (\Exception $e) {
        return "DB Error: " . $e->getMessage();
    }
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
