import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import sampleBookings from '@/data/bookings.json';
import { format, addDays, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';


export const useBookingStore = defineStore('bookings', () => {
  // State
  const bookings = ref([]);
  const loading = ref(false);
  const error = ref(null);
  
  // Rooms configuration
  const rooms = ref(['101', '102', '103', '104', '105']);
  const roomType = 'deluxe';

  // Getters
  const unallocatedBookings = computed(() => {
    return bookings.value.filter(booking => !booking.room || !rooms.value.includes(booking.room));
  });

  // Actions
  function loadBookings() {
    loading.value = true;
    try {
      // Try to load from localStorage first
      const savedBookings = localStorage.getItem('bookings');
      bookings.value = savedBookings ? JSON.parse(savedBookings) : [...sampleBookings];
    } catch (err) {
      error.value = 'Failed to load bookings';
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  function deleteBooking(bookingId) {
    // Create a new array for reactivity
    bookings.value = bookings.value.filter(b => b.id !== bookingId);
    saveToLocalStorage();
  }
  
  function addBooking(bookingData) {
    try {
      const newBooking = {
        id: Date.now(),
        transaction_id: `TXN${Math.floor(Math.random() * 10000)}`,
        transaction_status: 'completed',
        base_amount: 1000,
        tax_amount: 100,
        total_amount: 1100,
        ...bookingData,
        room_type: roomType // Force deluxe room type
      };

      validateBooking(newBooking);
      checkRoomAvailability(newBooking.room, newBooking.check_in, newBooking.check_out);

      // Use spread operator to create a new array for reactivity
      bookings.value = [...bookings.value, newBooking];
      saveToLocalStorage();
      return newBooking;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  }

  function updateBooking(id, updates) {
    try {
      const index = bookings.value.findIndex(b => b.id === id);
      if (index === -1) throw new Error('Booking not found');

      const updatedBooking = { ...bookings.value[index], ...updates };
      validateBooking(updatedBooking);

      // Check availability excluding current booking
      checkRoomAvailability(
        updatedBooking.room, 
        updatedBooking.check_in, 
        updatedBooking.check_out, 
        updatedBooking.id
      );

      // Create a new array to ensure Vue detects the change
      bookings.value = [
        ...bookings.value.slice(0, index),
        updatedBooking,
        ...bookings.value.slice(index + 1)
      ];
      
      saveToLocalStorage();
      return updatedBooking;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  }

  function reassignRoom(bookingId, newRoom) {
    try {
      if (!rooms.value.includes(newRoom)) {
        throw new Error('Invalid room number');
      }

      const booking = bookings.value.find(b => b.id === bookingId);
      if (!booking) throw new Error('Booking not found');

      // Check if room is available for the booking dates
      checkRoomAvailability(newRoom, booking.check_in, booking.check_out, bookingId);

      // Create a new booking object for reactivity
      const updatedBooking = { ...booking, room: newRoom };
      
      // Update the bookings array immutably
      const index = bookings.value.findIndex(b => b.id === bookingId);
      bookings.value = [
        ...bookings.value.slice(0, index),
        updatedBooking,
        ...bookings.value.slice(index + 1)
      ];
      
      saveToLocalStorage();
      return updatedBooking;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  }

  // Helper functions
  function checkRoomAvailability(room, checkIn, checkOut, excludeBookingId = null) {
    const newCheckIn = parseISO(checkIn);
    const newCheckOut = parseISO(checkOut);  

    const isAvailable = !bookings.value.some(booking => {
      // Skip the current booking when editing
      if (booking.id === excludeBookingId) return false;
  
      // Skip if room is not the same
      if (booking.room !== room) return false;
  
      const existingCheckIn = parseISO(booking.check_in);
      const existingCheckOut = parseISO(booking.check_out);
  
      // Check for overlap using isBefore and isAfter
      return (
        isBefore(newCheckIn, existingCheckOut) && isAfter(newCheckOut, existingCheckIn)
      );
    });
  
    if (!isAvailable) {
      throw new Error('Room is not available for the selected dates');
    }
  }
  
  function validateBooking(booking) {
    if (!booking.customer_name) throw new Error('Customer name is required');
    if (!booking.room) throw new Error('Room is required');
    if (!booking.check_in || !booking.check_out) throw new Error('Dates are required');
    
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    
    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be after check-in date');
    }
    
    if (!rooms.value.includes(booking.room)) {
      throw new Error('Invalid room number');
    }
    
    if (booking.room_type !== roomType) {
      throw new Error('Only deluxe rooms are supported');
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem('bookings', JSON.stringify(bookings.value));
  }

  // Initialize
  loadBookings();

  return {
    // State
    bookings,
    loading,
    error,
    rooms,
    
    // Getters
    unallocatedBookings,
    
    // Actions
    loadBookings,
    addBooking,
    updateBooking,
    reassignRoom,
    deleteBooking
  };
});