<?php 

namespace App\Http\Controllers\API;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class BookingController extends Controller
{
    public function index()
    {
        return response()->json([
            [
                'id' => 1,
                'customer_name' => 'Steve Smith',
                'room' => '101',
                'check_in' => '2025-05-01',
                'check_out' => '2025-05-03',
            ],
            [
                'id' => 2,
                'customer_name' => 'AB de Villiers',
                'room' => '102',
                'check_in' => '2025-05-02',
                'check_out' => '2025-05-05',
            ],
            // add more as needed...
        ]);
    }

    public function update(Request $request, $id)
    {
        // Just returning back updated data for now (no DB)
        return response()->json($request->all());
    }
}
