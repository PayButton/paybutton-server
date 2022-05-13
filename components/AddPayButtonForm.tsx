import React from "react";
import {
  FormRenderer,
  componentTypes,
} from "@data-driven-forms/react-form-renderer";
import {
  componentMapper,
} from "@data-driven-forms/mui-component-mapper";
import FormTemplate from "@data-driven-forms/mui-component-mapper/form-template";
import { supportedChains, supportedAddressesPattern } from 'types/constants'

const validateInput = function (value: string): string | undefined {
  if (value) {
    const addressList = value.trim().split('\n')
    for (let i = 0; i < addressList.length; i++) {
      // Disallow addresses withouth a 'chain:' prefix
      const addressWithPrefix = addressList[i];
      if(!addressWithPrefix.includes(':')) {
        return `You must specify the chain of the address '${addressWithPrefix}'.`
      }
      // Disallow addresses with an unknown prefix
      const [prefix, address] =  addressWithPrefix.split(':')
      if (!supportedChains.includes(prefix)) {
        return `'${prefix}' is not a valid prefix. Options are: ${supportedChains.join(', ')}`
      }
      // Validate if address is in valid format
      if (!address.match(supportedAddressesPattern)) {
        return `'${address}' is not a valid address. Make sure you have correctly input the address.`
      }
    }
  }
} // WIP unittests


const schema = {
  fields: [
    {
      component: "textarea",
      name: "addresses",
      label: "Addresses",
      helperText: "XEC and/or BCH wallet addresses",
      placeholder: "ecash:qr24f8...\nbitcoincash:pz8d20...",
      validate: [
        validateInput,
        { type: "required" }
      ]
    },
  ],
};

const Form = (props) => (
  <FormRenderer
    schema={schema}
    componentMapper={componentMapper}
    FormTemplate={FormTemplate}
    onSubmit={props.handleSubmit}
  />
);

export default Form;
