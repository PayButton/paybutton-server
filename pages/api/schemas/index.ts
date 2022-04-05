import  {  gql  }  from  "apollo-server-micro"; 

export  const  typeDefs  =  gql`
    type  PayButton {
        userId: ID 
        id: ID
        addresses: [String]
    }

    type  Query {
        getPayButtons: [PayButton]
        getPayButton(id: ID): PayButton
    }`
