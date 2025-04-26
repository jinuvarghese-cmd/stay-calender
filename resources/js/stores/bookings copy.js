import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import sampleBookingsData from '../data/bookings.json'


// Sample booking data based on the requirements

export const useBookingStore = defineStore('bookingStore', () => {
  // State
  const bookings = ref([]);
  const rooms = ref(['101', '102', '103', '104', '105']);
  const startDate = ref(new Date('2025-05-01').toISOString().split('T')[0]);
  const daysToShow = ref(14);
  const loading = ref(false);
  const error = ref(null);

  // Computed properties
  const endDate = computed(() => {
    const start = new Date(startDate.value);
    start.setDate(start.getDate() + daysToShow.value - 1);
    return start.toISOString().split('T')[0];
  });

  const unallocatedBookings = computed(() => {
    return bookings.value.filter(b => !b.room || !rooms.value.includes(b.room));
  });

  const roomOccupancy = computed(() => {
    const occupancy = {};
    
    rooms.value.forEach(room => {
      occupancy[room] = {};
      
      // Create a date range from startDate to endDate
      let current = new Date(startDate.value);
      const end = new Date(endDate.value);
      
      while (current <= end) {
        const dateKey = current.toISOString().split('T')[0];
        occupancy[room][dateKey] = false;
        current.setDate(current.getDate() + 1);
      }
    });
    
    // Mark occupied dates for each room
    bookings.value.forEach(booking => {
      if (rooms.value.includes(booking.room)) {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        let current = new Date(checkIn);
        
        // Mark all dates from check-in to check-out (exclusive) as occupied
        while (current < checkOut) {
          const dateKey = current.toISOString().split('T')[0];
          if (occupancy[booking.room] && occupancy[booking.room][dateKey] !== undefined) {
            occupancy[booking.room][dateKey] = booking.id;
          }
          current.setDate(current.getDate() + 1);
        }
      }
    });
    
    return occupancy;
  });

  // Actions
  function loadBookings() {
    loading.value = true;
    error.value = null;
    
    try {
      // In a real app, this would be an API call
      // For now, we'll use the sample data
      bookings.value = [...sampleBookingsData];
      
      // Store in localStorage for persistence
      localStorage.setItem('bookings', JSON.stringify(bookings.value));
    } catch (err) {
      console.error("Error loading bookings:", err);
      error.value = "Failed to load bookings";
    } finally {
      loading.value = false;
    }
  }

  function addBooking(newBooking) {
    try {
      // Generate a new unique ID
      const maxId = bookings.value.reduce((max, booking) => 
        booking.id > max ? booking.id : max, 0);
      
      // Add missing fields if not provided
      const booking = {
        id: maxId + 1,
        transaction_id: `TXN${String(maxId + 10).padStart(3, '0')}`,
        transaction_status: "completed",
        base_amount: 1000, // Default values
        tax_amount: 100,
        total_amount: 1100,
        ...newBooking
      };
      
      // Validate booking data
      validateBooking(booking);
      
      // Add to bookings
      bookings.value.push(booking);
      
      // Update localStorage
      localStorage.setItem('bookings', JSON.stringify(bookings.value));
      
      return booking;
    } catch (err) {
      console.error("Error adding booking:", err);
      error.value = err.message;
      throw err;
    }
  }

  function updateBooking(id, updatedBooking) {
    try {
      const index = bookings.value.findIndex(b => b.id === id);
      
      if (index === -1) {
        throw new Error(`Booking with ID ${id} not found`);
      }
      
      // Validate booking data
      validateBooking(updatedBooking);
      
      // Update booking
      bookings.value[index] = { ...bookings.value[index], ...updatedBooking };
      
      // Update localStorage
      localStorage.setItem('bookings', JSON.stringify(bookings.value));
      
      return bookings.value[index];
    } catch (err) {
      console.error("Error updating booking:", err);
      error.value = err.message;
      throw err;
    }
  }

  function deleteBooking(id) {
    try {
      const index = bookings.value.findIndex(b => b.id === id);
      
      if (index === -1) {
        throw new Error(`Booking with ID ${id} not found`);
      }
      
      // Remove booking
      bookings.value.splice(index, 1);
      
      // Update localStorage
      localStorage.setItem('bookings', JSON.stringify(bookings.value));
    } catch (err) {
      console.error("Error deleting booking:", err);
      error.value = err.message;
      throw err;
    }
  }

  function reassignRoom(id, newRoom) {
    try {
      if (!rooms.value.includes(newRoom)) {
        throw new Error(`Room ${newRoom} is not a valid room`);
      }
      
      const booking = bookings.value.find(b => b.id === id);
      
      if (!booking) {
        throw new Error(`Booking with ID ${id} not found`);
      }
      
      // Check for conflicts
      const isRoomAvailable = checkRoomAvailability(
        newRoom, 
        booking.check_in, 
        booking.check_out, 
        booking.id
      );
      
      if (!isRoomAvailable) {
        throw new Error(`Room ${newRoom} is not available for the selected dates`);
      }
      
      // Update room
      booking.room = newRoom;
      
      // Update localStorage
      localStorage.setItem('bookings', JSON.stringify(bookings.value));
      
      return booking;
    } catch (err) {
      console.error("Error reassigning room:", err);
      error.value = err.message;
      throw err;
    }
  }

  function updateDates(id, newCheckIn, newCheckOut) {
    try {
      const booking = bookings.value.find(b => b.id === id);
      
      if (!booking) {
        throw new Error(`Booking with ID ${id} not found`);
      }
      
      // Validate dates
      validateDates(newCheckIn, newCheckOut);
      
      // Check for conflicts
      const isRoomAvailable = checkRoomAvailability(
        booking.room, 
        newCheckIn, 
        newCheckOut, 
        booking.id
      );
      
      if (!isRoomAvailable) {
        throw new Error(`Room ${booking.room} is not available for the selected dates`);
      }
      
      // Update dates
      booking.check_in = newCheckIn;
      booking.check_out = newCheckOut;
      
      // Update localStorage
      localStorage.setItem('bookings', JSON.stringify(bookings.value));
      
      return booking;
    } catch (err) {
      console.error("Error updating dates:", err);
      error.value = err.message;
      throw err;
    }
  }

  // Check if a room is available for the given dates
  function checkRoomAvailability(room, checkIn, checkOut, excludeBookingId = null) {
    // Convert to Date objects for comparison
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    
    // Check for conflicts with existing bookings
    return !bookings.value.some(booking => {
      // Skip the current booking when checking
      if (excludeBookingId && booking.id === excludeBookingId) {
        return false;
      }
      
      if (booking.room !== room) {
        return false;
      }
      
      const bookingStart = new Date(booking.check_in);
      const bookingEnd = new Date(booking.check_out);
      
      // Check for overlap
      return (
        (startDate < bookingEnd && endDate > bookingStart) ||
        (startDate.getTime() === bookingStart.getTime()) ||
        (endDate.getTime() === bookingEnd.getTime())
      );
    });
  }

  // Validation helpers
  function validateBooking(booking) {
    // Check required fields
    const requiredFields = ['customer_name', 'room', 'room_type', 'check_in', 'check_out'];
    
    for (const field of requiredFields) {
      if (!booking[field]) {
        throw new Error(`${field} is required`);
      }
    }
    
    // Validate dates
    validateDates(booking.check_in, booking.check_out);
    
    // Validate room
    if (!rooms.value.includes(booking.room)) {
      throw new Error(`Room ${booking.room} is not a valid room`);
    }
    
    // Validate room type
    if (booking.room_type !== 'deluxe') {
      throw new Error('Only deluxe room type is supported');
    }
  }

  function validateDates(checkIn, checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Check if dates are valid
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Check that checkout is after checkin
    if (checkOutDate <= checkInDate) {
      throw new Error('Check-out date must be after check-in date');
    }
  }

  // Initialize from localStorage if available
  function initializeStore() {
    const storedBookings = localStorage.getItem('bookings');
    
    if (storedBookings) {
      try {
        bookings.value = JSON.parse(storedBookings);
      } catch (err) {
        console.error("Error parsing stored bookings:", err);
        // Fall back to sample data
        loadBookings();
      }
    } else {
      // Load sample data if nothing in localStorage
      loadBookings();
    }
  }

  // Call initialize on store creation
  initializeStore();

  return {
    // State
    bookings,
    rooms,
    startDate,
    daysToShow,
    loading,
    error,
    
    // Getters
    endDate,
    unallocatedBookings,
    roomOccupancy,
    
    // Actions
    loadBookings,
    addBooking,
    updateBooking,
    deleteBooking,
    reassignRoom,
    updateDates,
    checkRoomAvailability,
    
    // Helper functions exposed for component use
    validateDates
  }
})