const fs = require('fs');
const path = require('path');

// Fix StartShiftDialog
const startShiftPath = path.join(__dirname, 'src/components/shifts/StartShiftDialog.tsx');
let startShiftContent = fs.readFileSync(startShiftPath, 'utf8');

const oldStartValidation = `  const handleStartShift = async () => {
    // Validate opening float
    const floatValue = parseFloat(openingFloat);
    if (isNaN(floatValue) || floatValue < 0) {
      setError('Please enter a valid opening float amount');
      return;
    }

    setLoading(true);
    setError(null);`;

const newStartValidation = `  const handleStartShift = async () => {
    // Validate opening float
    const floatValue = parseFloat(openingFloat);
    if (isNaN(floatValue)) {
      setError('Please enter a valid number for opening float');
      return;
    }

    if (floatValue < 0) {
      setError('Opening float cannot be negative');
      return;
    }

    if (floatValue > 100000) {
      setError('Opening float seems too large. Please verify the amount.');
      return;
    }

    setLoading(true);
    setError(null);`;

startShiftContent = startShiftContent.replace(oldStartValidation, newStartValidation);
fs.writeFileSync(startShiftPath, startShiftContent, 'utf8');
console.log('Fixed StartShiftDialog validation!');

// Fix CloseShiftDialog
const closeShiftPath = path.join(__dirname, 'src/components/shifts/CloseShiftDialog.tsx');
let closeShiftContent = fs.readFileSync(closeShiftPath, 'utf8');

const oldCloseValidation = `  const handleCloseShift = async () => {
    if (!activeShift) {
      setError('No active shift found');
      return;
    }

    // Validate closing float
    const floatValue = parseFloat(closingFloat);
    if (isNaN(floatValue) || floatValue < 0) {
      setError('Please enter a valid closing float amount');
      return;
    }

    setLoading(true);
    setError(null);`;

const newCloseValidation = `  const handleCloseShift = async () => {
    if (!activeShift) {
      setError('No active shift found');
      return;
    }

    // Validate closing float
    const floatValue = parseFloat(closingFloat);
    if (isNaN(floatValue)) {
      setError('Please enter a valid number for closing float');
      return;
    }

    if (floatValue < 0) {
      setError('Closing float cannot be negative');
      return;
    }

    if (floatValue > 100000) {
      setError('Closing float seems too large. Please verify the amount.');
      return;
    }

    setLoading(true);
    setError(null);`;

closeShiftContent = closeShiftContent.replace(oldCloseValidation, newCloseValidation);
fs.writeFileSync(closeShiftPath, closeShiftContent, 'utf8');
console.log('Fixed CloseShiftDialog validation!');

console.log('All frontend validation improvements applied successfully!');
