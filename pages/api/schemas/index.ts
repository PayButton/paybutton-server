import  {  gql  }  from  "apollo-server-micro"; 

export  const  typeDefs  =  gql`
    type  Paybutton {
        userId: ID 
        id: ID
        addresses: [String]
    }

    type  Query {
        getPaybuttons: [Paybutton]
        getPaybutton(id: ID): Paybutton
    }`
