describe('API Tests', () => {
  it('should successfully make a POST request to endpoint A', () => {
    const requestBody = {
      start_date: '2024-01-01 00:00:00',
      end_date: '2024-03-17 23:59:59',
      // channel: 'ALL' // Uncomment if 'channel' is required
    };

    cy.request('POST', 'https://crm.linkaja.id/svc/report/ticket-monitor/a', requestBody)
      .then((response) => {
        expect(response.status).to.eq(200);
        cy.log(response.body);
        // Add more assertions as needed
      });
  });

  it('should successfully make a POST request to endpoint B', () => {
    const requestBody = {
      start_date: '2024-01-01 00:00:00',
      end_date: '2024-03-17 23:59:59',
      // channel: 'ALL' // Uncomment if 'channel' is required
    };

    cy.request('POST', 'https://crm.linkaja.id/svc/report/ticket-monitor/b', requestBody)
      .then((response) => {
        expect(response.status).to.eq(200);
        cy.log(response.body);
        // Add more assertions as needed
      });
  });
  
  it('should successfully make a POST request to endpoint C', () => {
    const requestBody = {
      start_date: '2024-01-01 00:00:00',
      end_date: '2024-03-17 23:59:59',
      // channel: 'ALL' // Uncomment if 'channel' is required
    };

    cy.request('POST', 'https://crm.linkaja.id/svc/report/ticket-monitor/c', requestBody)
      .then((response) => {
        expect(response.status).to.eq(200);
        cy.log(response.body);
        // Add more assertions as needed
      });
  });

  it('should successfully make a POST request to endpoint D', () => {
    const requestBody = {
      start_date: '2024-01-01 00:00:00',
      end_date: '2024-03-17 23:59:59',
      // channel: 'ALL' // Uncomment if 'channel' is required
    };

    cy.request('POST', 'https://crm.linkaja.id/svc/report/ticket-monitor/d', requestBody)
      .then((response) => {
        expect(response.status).to.eq(200);
        cy.log(response.body);
        // Add more assertions as needed
      });
  });

  it('should successfully make a POST request to endpoint E', () => {
    const requestBody = {
      start_date: '2024-01-01 00:00:00',
      end_date: '2024-03-17 23:59:59',
      // channel: 'ALL' // Uncomment if 'channel' is required
    };

    cy.request('POST', 'https://crm.linkaja.id/svc/report/ticket-monitor/e', requestBody)
      .then((response) => {
        expect(response.status).to.eq(200);
        cy.log(response.body);
        // Add more assertions as needed
      });
  });

  // Repeat for other endpoints if needed
});
