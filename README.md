# Stay Calendar

A dynamic and interactive hotel room booking management system that provides a visual calendar interface for managing reservations across multiple rooms.

## Features

- **Interactive Calendar View**: Visual calendar showing a 2-week booking window by default
- **Room Management**: View and manage bookings across 5 rooms (101, 102, 103, 104, 105)
- **Room Categories**: Support for room types (e.g., Deluxe)
- **Drag and Drop**: Intuitively move bookings between dates and rooms
- **Booking Operations**: Create, update, and delete bookings
- **Stay Duration**: Easily modify the length of stay for existing bookings
- **Room Reassignment**: Change room allocations with drag and drop
- **Customizable Date Range**: Adjust the visible date range (default: 14 days)

### Prerequisites

- PHP >= 8.0
- Composer
- Node.js and NPM
- Laravel 9+

### Installation

1. Clone the repository

2. Install PHP dependencies
   ```bash
   composer install
   ```

3. Install JavaScript dependencies
   ```bash
   npm install
   ```

### Running the Application

1. Start the development server for frontend assets
   ```bash
   npm run dev
   ```

2. Start the Laravel development server
   ```bash
   php artisan serve
   ```

3. Access the application at [http://localhost:8000](http://localhost:8000)

## Technologies Used

- **Backend**: Laravel PHP Framework
- **Frontend**: Vue.js
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **Database**: None
