// By default, Sequelize automatically adds the fields createdAt and updatedAt to every model,
// so they are also present in these types

export type PayButton = {
        id: string,
        userId: string,
        addresses: any,
}

export type Chain = {
        id: string,
        slug: string,
        title: string,
}
