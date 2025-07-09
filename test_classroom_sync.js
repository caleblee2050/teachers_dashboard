import { GoogleClassroomService } from './server/services/googleClassroom.js';

// Test function to debug classroom sync
async function testClassroomSync() {
  try {
    console.log('Testing classroom synchronization...');
    console.log('Note: This will only work with valid Google access tokens');
    
    // Since we cannot use mock tokens, we'll test the API structure
    console.log('GoogleClassroomService class is properly imported:', typeof GoogleClassroomService);
    
    // Test the class constructor
    const mockService = new GoogleClassroomService('test_token', 'test_refresh');
    console.log('Service instance created successfully');
    
    console.log('Methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(mockService)));
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
  }
}

testClassroomSync();