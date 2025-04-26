<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <h1 class="text-2xl font-bold mb-4">Stay Calendar</h1>

    <!-- Calendar Controls -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex space-x-2">
        <button class="px-3 py-1 border rounded" @click="previousPeriod">&lt;</button>
        <button class="px-3 py-1 bg-white border rounded" @click="goToToday">Today</button>
        <button class="px-3 py-1 border rounded" @click="nextPeriod">&gt;</button>
        <span class="px-3 py-1">{{ dateRangeLabel }}</span>
      </div>

      <div class="flex space-x-2">
        <button class="px-3 py-1 border rounded bg-black text-white" @click="showAddBookingModal">
          Add Booking
        </button>
      </div>
    </div>

    <!-- Calendar Table -->
    <div class="overflow-auto">
      <table class="table-fixed w-full border">
        <thead>
          <tr>
            <th class="w-28 border px-2 py-1 bg-gray-50">Room</th>
            <th 
              v-for="date in dateRange" 
              :key="date.toISOString()" 
              class="min-w-32 border px-2 py-1 bg-gray-50"
              :class="{'bg-green-200': isToday(date)}"
            >
              <div class="font-semibold">{{ formatDateHeader(date) }}</div>
              <div class="text-xs">{{ formatWeekday(date) }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Deluxe Rooms Header -->
          <tr class="bg-green-50">
            <td class="border px-2 py-1 font-semibold text-green-600">Deluxe Rooms</td>
            <td 
              v-for="date in dateRange" 
              :key="date.toISOString() + '-deluxe'" 
              class="border px-2 py-1 text-center"
              :class="{'bg-green-200': isToday(date)}"
            >
              {{ availableRoomsCount(date) }}
            </td>
          </tr>

          <!-- Individual Rooms -->
          <tr v-for="room in storeRooms" :key="room">
            <td class="border px-2 py-1 font-semibold bg-gray-50">{{ room }}</td>
            <td 
              v-for="(date, dateIndex) in dateRange" 
              :key="date.toISOString() + '-' + room" 
              class="h-20 border relative"
              :class="{'bg-green-200': isToday(date)}"
              @dragover.prevent="handleDragOver"
              @drop.prevent="handleDrop($event, room, date)"
              :data-date="format(date, 'yyyy-MM-dd')"
              :data-room="room"
              :data-index="dateIndex"
              role="gridcell"
              :aria-label="`Room ${room} on ${format(date, 'MMM d, yyyy')}`"
            >
              <template v-for="booking in getBookingsForRoomAndDate(room, date)" :key="booking.id">
                <div
                  v-if="isFirstDayOfBooking(booking, date)"
                  class="absolute inset-y-1 rounded shadow text-sm cursor-move overflow-hidden"
                  :style="getBookingStyle(booking, dateIndex)"
                  draggable="true"
                  :key="`booking-${booking.id}`"
                  @dragstart="handleDragStart($event, booking, date)"
                  @click.stop="openEditModal(booking)"
                  :aria-label="`Booking for ${booking.customer_name} from ${formatBookingDates(booking)}`"
                  role="button"
                  tabindex="0"
                  @keydown.enter="openEditModal(booking)"
                >
                  <div class="h-full flex flex-col p-1">
                    <div class="flex justify-between items-center">
                      <span class="truncate font-medium">{{ booking.customer_name }}</span>
                      <span class="drag-handle cursor-move ml-1" aria-hidden="true">⋮</span>
                    </div>
                    <div class="text-xs mt-auto">
                      {{ formatBookingDates(booking) }}
                    </div>
                  </div>
                  
                  <!-- Resize handles -->
                  <div 
                    class="resize-handle resize-handle-start"
                    @mousedown.stop="startResize($event, booking, 'start')"
                    role="slider"
                    aria-label="Adjust booking start date"
                  ></div>
                  <div 
                    class="resize-handle resize-handle-end"
                    @mousedown.stop="startResize($event, booking, 'end')"
                    role="slider"
                    aria-label="Adjust booking end date"
                  ></div>
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Booking Modal -->
    <BookingModal
      v-if="isAddModalOpen"
      :booking="newBooking"
      :existing-bookings="bookings"
      mode="add"
      @save="handleAddBooking"
      @close="closeAddModal"
    />

    <!-- Edit Booking Modal -->
    <BookingModal
      v-if="isEditModalOpen"
      :booking="editingBooking"
      :existing-bookings="bookings.filter(b => b.id !== editingBooking?.id)"
      mode="edit"
      @save="handleUpdateBooking"
      @delete="handleDeleteBooking"
      @close="closeEditModal"
    />
    
    <!-- Notifications -->
    <div v-if="notification" class="fixed bottom-4 right-4 bg-white shadow-lg rounded p-4 max-w-sm z-50">
      <div class="flex">
        <div :class="[notification.type === 'error' ? 'text-red-500' : 'text-green-500']">
          <span v-if="notification.type === 'error'">❌</span>
          <span v-else>✅</span>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-900">{{ notification.message }}</p>
        </div>
        <div class="ml-auto pl-3">
          <button 
            @click="notification = null"
            class="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useBookingStore } from '@/stores/bookings';
import { 
  format, addDays, parseISO, isWithinInterval, isSameDay, 
  isBefore, isAfter, differenceInDays, startOfDay, subDays
} from 'date-fns';
import BookingModal from '@/components/BookingModal.vue';

const bookingStore = useBookingStore();
const bookings = computed(() => bookingStore.bookings);
const storeRooms = computed(() => bookingStore.rooms);

// Calendar configuration
const daysToShow = ref(14);
const startDate = ref(startOfDay(new Date()));

// Modal states
const isAddModalOpen = ref(false);
const isEditModalOpen = ref(false);
const newBooking = ref(createNewBooking());
const editingBooking = ref(null);

// Drag and resize states
const draggedBooking = ref(null);
const resizingBooking = ref(null);
const resizingType = ref(null);
const resizingOriginalBooking = ref(null);

// Notification system
const notification = ref(null);

// Computed properties
const dateRange = computed(() => {
  const dates = [];
  for (let i = 0; i < daysToShow.value; i++) {
    dates.push(addDays(startDate.value, i));
  }
  return dates;
});

const dateRangeLabel = computed(() => {
  if (dateRange.value.length === 0) return '';
  const start = format(dateRange.value[0], 'MMM d');
  const end = format(dateRange.value[dateRange.value.length - 1], 'MMM d, yyyy');
  return `${start} - ${end}`;
});

// Initialize store
onMounted(() => {
  try {
    bookingStore.loadBookings();
  } catch (error) {
    showNotification('Error loading bookings. Please try again.', 'error');
  }
});

// Clean up event listeners when component is destroyed
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', stopResize);
  
  // Clear any cached data
  if (getBookingsForRoomAndDate.cache) {
    getBookingsForRoomAndDate.cache = {};
  }
});

// Watch for booking store error changes
watch(() => bookingStore.error, (newError) => {
  if (newError) {
    showNotification(newError, 'error');
  }
});

// Clear cache when bookings change or date range changes
watch([bookings, dateRange], () => {
  if (getBookingsForRoomAndDate.cache) {
    getBookingsForRoomAndDate.cache = {};
  }
}, { deep: true });

// Notification helper
function showNotification(message, type = 'success') {
  notification.value = { message, type };
  setTimeout(() => {
    if (notification.value?.message === message) {
      notification.value = null;
    }
  }, 5000);
}

// Date formatting helpers
function formatDateHeader(date) {
  return format(date, 'MMM d');
}

function formatWeekday(date) {
  return format(date, 'EEE');
}

function formatBookingDates(booking) {
  return `${format(parseISO(booking.check_in), 'MMM d')} - ${format(parseISO(booking.check_out), 'MMM d')}`;
}

// Calendar navigation
function goToToday() {
  startDate.value = startOfDay(new Date());
}

function previousPeriod() {
  startDate.value = addDays(startDate.value, -daysToShow.value);
}

function nextPeriod() {
  startDate.value = addDays(startDate.value, daysToShow.value);
}

// Date helpers
function isToday(date) {
  return isSameDay(date, new Date());
}

// Booking helpers
function createNewBooking() {
  return {
    customer_name: '',
    room: storeRooms.value[0],
    room_type: 'deluxe', // Match the store's roomType
    check_in: format(new Date(), 'yyyy-MM-dd'),
    check_out: format(addDays(new Date(), 1), 'yyyy-MM-dd')
  };
}

function getBookingsForRoomAndDate(room, date) {
  // Use memo cache to improve performance
  const cacheKey = `${room}-${format(date, 'yyyy-MM-dd')}`;
  if (!getBookingsForRoomAndDate.cache) {
    getBookingsForRoomAndDate.cache = {};
  }
  
  if (getBookingsForRoomAndDate.cache[cacheKey]) {
    return getBookingsForRoomAndDate.cache[cacheKey];
  }
  
  const result = bookings.value.filter(booking => {
    if (booking.room !== room) return false;
    
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    
    // Check if date is within the booking range (inclusive of check-in, exclusive of check-out)
    return isWithinInterval(date, { 
      start: checkIn, 
      end: addDays(checkOut, -1) // Adjust check-out to be exclusive
    });
  });
  
  getBookingsForRoomAndDate.cache[cacheKey] = result;
  return result;
}

function availableRoomsCount(date) {
  const totalRooms = storeRooms.value.length;
  const bookedRooms = new Set();
  
  bookings.value.forEach(booking => {
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    
    if (isWithinInterval(date, { 
      start: checkIn, 
      end: addDays(checkOut, -1) // Adjust check-out to be exclusive
    })) {
      bookedRooms.add(booking.room);
    }
  });
  
  return totalRooms - bookedRooms.size;
}

function isFirstDayOfBooking(booking, date) {
  return isSameDay(parseISO(booking.check_in), date);
}

function getBookingStyle(booking, startColumnIndex) {
  const checkIn = parseISO(booking.check_in);
  const checkOut = parseISO(booking.check_out);
  
  // Calculate booking duration in days (check-out date is exclusive)
  const durationDays = differenceInDays(checkOut, checkIn);
  
  // Calculate where in the view this booking starts
  const bookingStartDate = parseISO(booking.check_in);
  const viewStartDate = dateRange.value[0];
  
  // Calculate how many days from the start of our view to the start of the booking
  let bookingStartsAtIndex = 0;
  
  for (let i = 0; i < dateRange.value.length; i++) {
    if (isSameDay(dateRange.value[i], bookingStartDate)) {
      bookingStartsAtIndex = i;
      break;
    }
  }
  
  // Calculate how many days the booking spans within our current view
  const visibleDays = Math.min(durationDays, dateRange.value.length - bookingStartsAtIndex);
  
  // Ensure visibleDays is at least 1
  const finalVisibleDays = Math.max(visibleDays, 1);
  
  // Get color based on room type
  let backgroundColor;
  switch (booking.room_type) {
    case 'deluxe':
      backgroundColor = '#bfdbfe'; // blue-200
      break;
    case 'standard':
      backgroundColor = '#fecaca'; // red-200
      break;
    case 'suite':
      backgroundColor = '#bbf7d0'; // green-200
      break;
    default:
      backgroundColor = '#e5e7eb'; // gray-200
  }
  
  return {
    backgroundColor,
    left: '0.5rem',
    right: '0.5rem',
    width: `calc(${finalVisibleDays * 100}% - 1rem)`,
    borderRadius: '0.25rem',
    zIndex: 10
  };
}

// Modal handlers
function showAddBookingModal() {
  // Reset to create a fresh booking with current defaults
  newBooking.value = createNewBooking();
  isAddModalOpen.value = true;
}

function closeAddModal() {
  isAddModalOpen.value = false;
}

function openEditModal(booking) {
  // Create a deep clone to avoid unintended reactivity issues
  editingBooking.value = JSON.parse(JSON.stringify(booking));
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingBooking.value = null;
}

async function handleAddBooking(bookingData) {
  try {
    await bookingStore.addBooking(bookingData);
    closeAddModal();
    showNotification('Booking added successfully');
  } catch (error) {
    showNotification('Failed to add booking: ' + error.message, 'error');
  }
}

async function handleUpdateBooking(bookingData) {
  try {
    await bookingStore.updateBooking(editingBooking.value.id, bookingData);
    closeEditModal();
    showNotification('Booking updated successfully');
  } catch (error) {
    showNotification('Failed to update booking: ' + error.message, 'error');
  }
}

async function handleDeleteBooking(bookingId) {
  try {
    await bookingStore.deleteBooking(bookingId);
    closeEditModal();
    showNotification('Booking deleted successfully');
  } catch (error) {
    showNotification('Failed to delete booking: ' + error.message, 'error');
  }
}

// // Drag and drop handlers
function handleDragStart(event, booking) {
  // Create a deep copy to avoid reference issues
  draggedBooking.value = JSON.parse(JSON.stringify(booking));
  event.dataTransfer.setData('text/plain', booking.id);
  event.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleDrop(event, targetRoom, targetDate) {
  event.preventDefault();
  
  if (!draggedBooking.value) return;
  
  const bookingId = draggedBooking.value.id;
  
  // Calculate the duration of the booking in days
  const checkIn = parseISO(draggedBooking.value.check_in);
  const checkOut = parseISO(draggedBooking.value.check_out);
  const duration = differenceInDays(checkOut, checkIn);
  
  // Format the new dates
  const newCheckIn = format(targetDate, 'yyyy-MM-dd');
  const newCheckOut = format(addDays(targetDate, duration), 'yyyy-MM-dd');
  
  // Create the updated booking object
  const updatedBooking = {
    ...draggedBooking.value,
    room: targetRoom,
    check_in: newCheckIn,
    check_out: newCheckOut
  };
  
  // Update the booking using store method which handles validation
  try {
    bookingStore.updateBooking(bookingId, updatedBooking);
    showNotification('Booking moved successfully');
  } catch (error) {
    showNotification('Failed to move booking: ' + error.message, 'error');
  }
  
  draggedBooking.value = null;
}


// Resize handlers
function startResize(event, booking, type) {
  event.preventDefault();
  event.stopPropagation();
  
  // Store original booking for comparison/restoration
  resizingOriginalBooking.value = JSON.parse(JSON.stringify(booking));
  resizingBooking.value = JSON.parse(JSON.stringify(booking));
  resizingType.value = type;
  
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', stopResize);
}

function handleResizeMove(event) {
  if (!resizingBooking.value) return;

  // Get the element under the cursor
  const elements = document.elementsFromPoint(event.clientX, event.clientY);
  
  // Find the table cell (td) element
  const dateCell = elements.find(el => {
    return el.tagName === 'TD' && el.hasAttribute('data-date') && el.hasAttribute('data-room');
  });

  if (!dateCell) return;

  // Get the date and room from the cell's data attributes
  const cellDate = dateCell.getAttribute('data-date');
  const cellRoom = dateCell.getAttribute('data-room');
  
  if (!cellDate || !cellRoom) return;
  
  // Only allow resizing within the same room
  if (cellRoom !== resizingBooking.value.room) return;
  
  const bookingId = resizingBooking.value.id;
  
  // Create a working copy of the booking
  const updatedBooking = { ...resizingBooking.value };
  
  // Get the parsed dates for easier comparison
  const cellDateObj = parseISO(cellDate);
  
  if (resizingType.value === 'start') {
    // Update check-in date (can't be after current check-out minus 1 day)
    if (isBefore(cellDateObj, parseISO(updatedBooking.check_out))) {
      updatedBooking.check_in = cellDate;
    }
  } else if (resizingType.value === 'end') {
    // Update check-out date (can't be before current check-in plus 1 day)
    // Add 1 day to the selected date since check-out is exclusive
    const newCheckOut = format(addDays(cellDateObj, 1), 'yyyy-MM-dd');
    if (isAfter(parseISO(newCheckOut), parseISO(updatedBooking.check_in))) {
      updatedBooking.check_out = newCheckOut;
    }
  }
  
  // Update the store - the store will handle validation internally
  try {
    bookingStore.updateBooking(bookingId, updatedBooking);
    // Update our working copy with the successfully updated booking
    resizingBooking.value = updatedBooking;
  } catch (error) {
    // If error occurs during update, don't update our working copy
    console.error('Failed to resize booking:', error.message);
  }
}

function stopResize() {
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', stopResize);
  
  if (resizingBooking.value && resizingOriginalBooking.value) {
    const originalCheckIn = resizingOriginalBooking.value.check_in;
    const originalCheckOut = resizingOriginalBooking.value.check_out;
    const newCheckIn = resizingBooking.value.check_in;
    const newCheckOut = resizingBooking.value.check_out;
    
    // Only show notification if dates actually changed
    if (originalCheckIn !== newCheckIn || originalCheckOut !== newCheckOut) {
      showNotification('Booking dates updated successfully');
    }
  }
  
  // Reset the resizing state
  resizingBooking.value = null;
  resizingType.value = null;
  resizingOriginalBooking.value = null;
}
</script>

<style scoped>
.drag-handle {
  cursor: move;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.drag-handle:hover {
  opacity: 1;
}

.resize-handle {
  position: absolute;
  width: 8px;
  top: 0;
  bottom: 0;
  cursor: col-resize;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s, background-color 0.2s;
}

.resize-handle:hover {
  opacity: 1;
  background-color: rgba(59, 130, 246, 0.7);
}

/* Show handles on booking hover */
div[draggable]:hover .resize-handle {
  opacity: 0.7;
}

.resize-handle-start {
  left: 0;
}

.resize-handle-end {
  right: 0;
}

td {
  position: relative;
  min-width: 140px;
}
</style>