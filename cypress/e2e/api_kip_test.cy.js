describe('API Tests', () => {
    it('should successfully make a POST request to endpoint KIP', () => {
      const requestBody = {
        start_date: '2024-01-01 00:00:00',
        end_date: '2024-03-17 23:59:59',
        channel: 'ALL' // Uncomment if 'channel' is required
      };
  
      cy.request('POST', 'https://crm.linkaja.id/svc/report/ticket-open-out-sla', requestBody)
        .then((response) => {
          expect(response.status).to.eq(200);
          cy.log(response.body);
          // Add more assertions as needed
        });
    });
  
  });
  