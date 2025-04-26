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
                  @change="validateDates"
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
                  @change="validateDates"
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
              :disabled="!!errorMessage"
            >
              {{ mode === 'add' ? 'Add Booking' : 'Update Booking' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue';
  
  const props = defineProps({
    booking: {
      type: Object,
      required: true
    },
    mode: {
      type: String,
      required: true,
      validator: value => ['add', 'edit'].includes(value)
    }
  });
  
  const emit = defineEmits(['save', 'close', 'delete']);
  
  const rooms = ['101', '102', '103', '104', '105'];
  const localBooking = ref({ ...props.booking });
  const errorMessage = ref('');
  
  // Validate dates whenever they change
  watch(
    () => [localBooking.value.check_in, localBooking.value.check_out],
    () => {
      validateDates();
    }
  );
  
  function validateDates() {
    if (!localBooking.value.check_in || !localBooking.value.check_out) {
      errorMessage.value = '';
      return;
    }
    
    const checkIn = new Date(localBooking.value.check_in);
    const checkOut = new Date(localBooking.value.check_out);
    
    if (checkOut <= checkIn) {
      errorMessage.value = 'Check-out date must be after check-in date';
    } else {
      errorMessage.value = '';
    }
  }
  
  function handleSave() {
    if (errorMessage.value) return;
    emit('save', localBooking.value);
  }
  
  function handleClose() {
    emit('close');
  }

  function handleDelete(){
    if (confirm('Are you sure you want to delete this booking?')) {
      emit('delete', localBooking.value.id);
      emit('close');
    }
  }

  
  </script>