import { connectGoogle, isExtension } from './google-calendar.js';

const button = document.getElementById('authorizeGoogle');
const status = document.getElementById('connectStatus');
const errorMessage = document.getElementById('connectError');

if (!isExtension()) {
  button.disabled = true;
  errorMessage.textContent = 'Open this page from the installed Chrome extension. / ከተጫነው የChrome ቅጥያ ውስጥ ይክፈቱ።';
}

button.addEventListener('click', async () => {
  button.disabled = true;
  errorMessage.textContent = '';
  status.textContent = 'Connecting... / በማገናኘት ላይ...';
  try {
    await connectGoogle();
    status.textContent = 'Connected. Close this tab, reopen Ethiopian Calendar, and click a date. / ተገናኝቷል። ይህን ትር ዝጉ፣ ቀን መቁጠሪያውን እንደገና ከፍተው ቀን ይምረጡ።';
  } catch (error) {
    console.error('Google Calendar connection failed:', error.code || 'storage');
    status.textContent = '';
    errorMessage.textContent = 'Connection failed or was cancelled. Check Setup help below, allow both read permissions, and try again. / መገናኘት አልተቻለም። ፈቃዶቹን ይስጡና እንደገና ይሞክሩ።';
    button.disabled = false;
  }
});
