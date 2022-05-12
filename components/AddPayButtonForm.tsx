import React from "react";
import {
  FormRenderer,
  componentTypes,
} from "@data-driven-forms/react-form-renderer";
import {
  componentMapper,
} from "@data-driven-forms/mui-component-mapper";
import FormTemplate from "@data-driven-forms/mui-component-mapper/form-template";

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

const Form = (props) => (
  <FormRenderer
    schema={schema}
    componentMapper={componentMapper}
    FormTemplate={FormTemplate}
    onSubmit={props.handleSubmit}
  />
);

export default Form;
