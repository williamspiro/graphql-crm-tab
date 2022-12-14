const hubspot = require('@hubspot/api-client');

exports.main = async (context = {}, sendResponse) => {

  const { 
    propertiesToSend: { 
      hs_object_id 
    } 
  } = context;

  const query = `
    query MyQuery($id: String!) {
      CRM {
        contact(uniqueIdentifier: "id", uniqueIdentifierValue: $id) {
          associations {
            company_collection__primary {
              items {
                name
                domain
                hs_object_id
                associations {
                  deal_collection__company_to_deal(filter: {hs_is_closed__eq: false}) {
                    total
                    items {
                      amount
                      dealname
                      dealstage
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `
  const queryBody = {
    "operationName": "MyQuery",
    "query": query,
    "variables": {"id": hs_object_id}
  }

  const hubspotClient = new hubspot.Client({ accessToken: process.env.ACCESS_TOKEN, basePath: 'https://api.hubapiqa.com'  })
  const gqlRequest = await hubspotClient.apiRequest({
    method: 'POST',
    path: '/collector/graphql',
    body: queryBody,
  })

  const gqlRequestResults = await gqlRequest.json();

  console.log(gqlRequestResults)

    var sections = []

    if (typeof gqlRequestResults.data.CRM.contact.associations.company_collection__primary.items[0] !== 'undefined') {
      var company = gqlRequestResults.data.CRM.contact.associations.company_collection__primary.items[0];
      var companySection = {
        "type": "descriptionList",
        "items": [
          {
            "label": "Company",
            "value": {
              "type": "text",
              "format": "markdown",
              "text": `[${company.name}](https://app.hubspotqa.com/contacts/102940484/company/${company.id})`
            }
          },
          {
            "label": "Domain",
            "value": {
              "type": "text",
              "format": "markdown",
              "text": `[${company.domain}](${company.domain})`
              }
          }
        ]
      }
      sections.push(companySection)

      if (typeof gqlRequestResults.data.CRM.contact.associations.company_collection__primary.items[0].associations.deal_collection__company_to_deal !== 'undefined') {
        var companyDeals = gqlRequestResults.data.CRM.contact.associations.company_collection__primary.items[0].associations.deal_collection__company_to_deal;
        const totalOutstandingDealValue = companyDeals.items.reduce((accumulator, object) => {
          return accumulator + parseInt(object.amount);
        }, 0);
    
        if (totalOutstandingDealValue >= 5000) {
          var tagSection = {
            "type": "tag",
            "text": "High MRR",
            "variant": "warning"
          }
          sections.push(tagSection)
        }
    
        var statisticsSection = {
          "type": "statistics",
          "items": [
            {
            "label": "Open deals value",
            "number": totalOutstandingDealValue.toString(),
            "description": `${companyDeals.total} open deals`
            }
          ]
        }
        sections.push(statisticsSection)

      } else {
        var noDealsSection = {
          "type": "text",
          "text": "No deals :("
        }
        sections.push(noDealsSection)
      }
    } else {
      
      var noCompanySection = {
        "type": "text",
        "text": "No associated company :( Associate this contact to a company to have some fun!"
      }
      sections.push(noCompanySection)
    }

    sendResponse({
      sections: sections
    });
};