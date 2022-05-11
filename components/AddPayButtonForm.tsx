import React from "react";
import {
  FormRenderer,
  componentTypes,
} from "@data-driven-forms/react-form-renderer";
import {
  componentMapper,
} from "@data-driven-forms/mui-component-mapper";
import FormTemplate from "@data-driven-forms/mui-component-mapper/form-template";
import { websiteDomain } from 'config/appInfo'
import axios from "axios";

const schema = {
    fields: [
        {
            component: "textarea",
            name: "addresses",
            label: "Addresses",
            helperText: "XEC and/or BCH wallet addresses",
        },
    ],
};

const onSubmit = async (formData) => {
    const res = await axios.post(`${websiteDomain}/api/paybutton`,
        { addresses: formData.addresses }
    )
}

const Form = () => (
  <FormRenderer
    schema={schema}
    componentMapper={componentMapper}
    FormTemplate={FormTemplate}
    onSubmit={onSubmit}
  />
);

export default Form;
