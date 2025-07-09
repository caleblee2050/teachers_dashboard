// Test the actual classroom synchronization through the running server
import fetch from 'node-fetch';

async function testLiveClassroomSync() {
  try {
    console.log('=== Testing Live Classroom Sync ===');
    
    // Test classroom permissions first
    console.log('1. Testing classroom permissions...');
    const permissionsResponse = await fetch('http://localhost:5000/api/classroom/check-permissions', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const permissionsData = await permissionsResponse.json();
    console.log('Permissions response:', permissionsData);
    
    if (permissionsData.hasPermissions) {
      console.log('2. Testing courses fetch...');
      const coursesResponse = await fetch('http://localhost:5000/api/classroom/courses', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const coursesData = await coursesResponse.json();
      console.log('Courses response:', coursesData);
      
      if (coursesData.length > 0) {
        const testCourseId = coursesData[0].id;
        console.log('3. Testing assignments fetch for course:', testCourseId);
        
        const assignmentsResponse = await fetch(`http://localhost:5000/api/classroom/courses/${testCourseId}/assignments`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const assignmentsData = await assignmentsResponse.json();
        console.log('Assignments response:', assignmentsData);
        console.log('Number of assignments found:', assignmentsData.length);
        
        if (assignmentsData.length > 0) {
          console.log('Assignment titles:', assignmentsData.map(a => a.title));
        }
      }
    } else {
      console.log('No classroom permissions - user needs to authenticate');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testLiveClassroomSync();