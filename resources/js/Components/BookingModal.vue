<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">{{ mode === 'add' ? 'Add Booking' : 'Edit Booking' }}</h2>
      
      <form @submit.prevent="handleSave">
        <div class="space-y-4">
          <div>
            <label for="customer_name" class="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              id="customer_name"
              v-model="localBooking.customer_name"
              type="text"
              class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label for="room" class="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select
              id="room"
              v-model="localBooking.room"
              class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              @change="validateBooking"
            >
              <option v-for="room in rooms" :key="room" :value="room">{{ room }}</option>
            </select>
          </div>
          
          <div>
            <label for="room_type" class="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
            <select
              id="room_type"
              v-model="localBooking.room_type"
              class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled
            >
              <option value="deluxe">Deluxe</option>
              <option value="standard">Standard</option>
              <option value="suite">Suite</option>
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="check_in" class="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
              <input
                id="check_in"
                v-model="localBooking.check_in"
                type="date"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                @change="validateBooking"
                :min="minCheckInDate"
              />
            </div>
            
            <div>
              <label for="check_out" class="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
              <input
                id="check_out"
                v-model="localBooking.check_out"
                type="date"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                @change="validateBooking"
                :min="minCheckOutDate"
              />
            </div>
          </div>
          
          <div v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</div>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="handleClose"
          >
            Cancel
          </button>

          <button
            v-if="mode === 'edit'"
            type="button"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="handleDelete"
          >
            Delete
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            :disabled="!!errorMessage || isSubmitting"
          >
            {{ mode === 'add' ? 'Add Booking' : 'Update Booking' }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">Confirm Deletion</h2>
      <p class="mb-6">Are you sure you want to delete this booking for {{ localBooking.customer_name }}?</p>
      
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="showDeleteConfirm = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          @click="confirmDelete"
        >
          Delete Booking
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { format, addDays, parseISO, isAfter, isBefore, isSameDay } from 'date-fns';

const props = defineProps({
  booking: {
    type: Object,
    required: true
  },
  mode: {
    type: String,
    required: true,
    validator: value => ['add', 'edit'].includes(value)
  },
  existingBookings: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['save', 'close', 'delete']);

const rooms = ['101', '102', '103', '104', '105'];
const localBooking = ref({ ...props.booking });
const errorMessage = ref('');
const isSubmitting = ref(false);
const showDeleteConfirm = ref(false);

// Deep copy booking data to ensure reactivity
function resetLocalBooking() {
  localBooking.value = JSON.parse(JSON.stringify(props.booking));
}

// Computed properties for date constraints
const today = computed(() => format(new Date(), 'yyyy-MM-dd'));
const minCheckInDate = computed(() => today.value);
const minCheckOutDate = computed(() => {
  if (!localBooking.value.check_in) {
    return format(addDays(new Date(), 1), 'yyyy-MM-dd');
  }
  return format(addDays(parseISO(localBooking.value.check_in), 1), 'yyyy-MM-dd');
});

// Validate on component mount and when booking prop changes
onMounted(() => {
  resetLocalBooking();
  validateBooking();
});

watch(
  () => props.booking,
  () => {
    resetLocalBooking();
    validateBooking();
  },
  { deep: true }
);

// Validate whenever any booking details change
watch(
  () => [localBooking.value.check_in, localBooking.value.check_out, localBooking.value.room],
  () => {
    validateBooking();
  },
  { deep: true }
);

function validateBooking() {
  // Clear previous errors
  errorMessage.value = '';

  // Check if dates are selected
  if (!localBooking.value.check_in || !localBooking.value.check_out) {
    return;
  }

  // Validate check-in is not in the past
  const checkIn = parseISO(localBooking.value.check_in);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isBefore(checkIn, today) && props.mode === 'add') {
    errorMessage.value = 'Check-in date cannot be in the past';
    return;
  }

  const checkOut = parseISO(localBooking.value.check_out);
  
  // Validate date range (check-out must be after check-in)
  if (isSameDay(checkOut, checkIn) || isBefore(checkOut, checkIn)) {
    errorMessage.value = 'Check-out date must be after check-in date';
    return;
  }

  // Check room availability only if we have existing bookings
  if (props.existingBookings && props.existingBookings.length > 0) {
    const isAvailable = checkRoomAvailability(
      localBooking.value.room,
      localBooking.value.check_in,
      localBooking.value.check_out,
      props.mode === 'edit' ? localBooking.value.id : null
    );

    if (!isAvailable) {
      errorMessage.value = 'Room is not available for the selected dates';
      return;
    }
  }
}

function checkRoomAvailability(room, checkIn, checkOut, currentBookingId = null) {
  const newCheckIn = parseISO(checkIn);
  const newCheckOut = parseISO(checkOut);

  return !props.existingBookings.some(booking => {
    // Skip the current booking when editing
    if (currentBookingId && booking.id === currentBookingId) return false;
    
    // Check if it's the same room
    if (booking.room !== room) return false;

    const existingCheckIn = parseISO(booking.check_in);
    const existingCheckOut = parseISO(booking.check_out);

    // Check if the booking dates overlap
    return (
      (isBefore(newCheckIn, existingCheckOut) && isAfter(newCheckOut, existingCheckIn))
    );
  });
}

function handleSave() {
  if (errorMessage.value) return;
  
  isSubmitting.value = true;
  
  // In a real app, you might want to add validation here for all required fields
  if (!localBooking.value.customer_name || !localBooking.value.room || 
      !localBooking.value.room_type || !localBooking.value.check_in || 
      !localBooking.value.check_out) {
    errorMessage.value = 'Please fill in all required fields';
    isSubmitting.value = false;
    return;
  }
  
  // Create a clean copy of the booking to emit
  const bookingToSave = JSON.parse(JSON.stringify(localBooking.value));
  
  // Always force room type to deluxe to match store constraints
  bookingToSave.room_type = 'deluxe';
  
  emit('save', bookingToSave);
  isSubmitting.value = false;
}

function handleClose() {
  emit('close');
}

function handleDelete() {
  showDeleteConfirm.value = true;
}

function confirmDelete() {
  emit('delete', localBooking.value.id);
  showDeleteConfirm.value = false;
}
</script>